// ============================================================
// 🛡️ security/middleware.js — Production Security Layer
// helmet, cors, compression, rate limiting, validation
// ============================================================

let helmet, compression, rateLimit;
try { helmet = require('helmet'); } catch (_) {}
try { compression = require('compression'); } catch (_) {}
try { rateLimit = require('express-rate-limit'); } catch (_) {}

/**
 * Apply all security middleware to express app.
 * Safe defaults for AI/SSE/streaming workloads.
 */
function applySecurityMiddleware(app, options = {}) {
  const logger = options.logger;

  // Helmet — security headers
  if (helmet) {
    app.use(helmet({
      contentSecurityPolicy: false,         // many AI apps embed varied content
      crossOriginEmbedderPolicy: false,     // allow image previews
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }));
    logger?.info('Helmet enabled');
  }

  // Compression — but skip SSE
  if (compression) {
    app.use(compression({
      filter: (req, res) => {
        // Skip SSE so streaming works
        const ct = res.getHeader('Content-Type');
        if (ct && String(ct).includes('text/event-stream')) return false;
        return compression.filter(req, res);
      },
    }));
    logger?.info('Compression enabled');
  }

  // Trust proxy (Railway/Vercel/Cloudflare)
  app.set('trust proxy', 1);
}

/**
 * Create per-route rate limiters.
 */
function createRateLimiters() {
  if (!rateLimit) {
    // Fallback no-op
    const noop = (req, res, next) => next();
    return {
      auth: noop,
      ai: noop,
      api: noop,
      strict: noop,
    };
  }

  return {
    // Auth: 10 login attempts per 15 min
    auth: rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10,
      message: { error: 'Too many auth attempts. Try again later.' },
      standardHeaders: true,
      legacyHeaders: false,
    }),

    // AI: 60 requests per minute (per user/IP)
    ai: rateLimit({
      windowMs: 60 * 1000,
      max: 60,
      keyGenerator: (req) => req.user?.id ? `u:${req.user.id}` : req.ip,
      message: { error: 'Rate limit exceeded. Slow down.' },
      standardHeaders: true,
      legacyHeaders: false,
    }),

    // General API: 200/min
    api: rateLimit({
      windowMs: 60 * 1000,
      max: 200,
      keyGenerator: (req) => req.user?.id ? `u:${req.user.id}` : req.ip,
      standardHeaders: true,
      legacyHeaders: false,
    }),

    // Strict: 5/min for expensive ops (deploy, mega-build)
    strict: rateLimit({
      windowMs: 60 * 1000,
      max: 5,
      keyGenerator: (req) => req.user?.id ? `u:${req.user.id}` : req.ip,
      message: { error: 'This endpoint allows max 5 requests/min.' },
      standardHeaders: true,
      legacyHeaders: false,
    }),
  };
}

/**
 * Sanitize input - removes dangerous content.
 */
function sanitizeInput(input, options = {}) {
  if (input == null) return '';
  let str = String(input);

  const maxLen = options.maxLength || 50000;
  if (str.length > maxLen) str = str.slice(0, maxLen);

  if (options.stripHtml !== false) {
    str = str
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  }

  // Remove null bytes
  str = str.replace(/\0/g, '');

  return str;
}

/**
 * Detect security threats in input.
 */
function detectThreats(input) {
  const str = String(input || '');
  return {
    has_script_tag: /<script[\s\S]*?>/i.test(str),
    has_sql_injection: /(\bunion\s+select\b|\bdrop\s+table\b|;\s*--|\/\*\s*\*\/)/i.test(str),
    has_path_traversal: /(\.\.\/|\.\.\\)/i.test(str),
    has_command_injection: /(\$\(|`[^`]*`|\|\s*sh\b|;\s*rm\s+)/i.test(str),
    has_pii: /(\b\d{3}-\d{2}-\d{4}\b|password\s*[:=]\s*\S{6,})/i.test(str),
    too_long: str.length > 100000,
  };
}

function isSafe(input) {
  const t = detectThreats(input);
  return !Object.values(t).some(v => v === true);
}

/**
 * Validation helpers.
 */
const validators = {
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim()),
  url: (v) => {
    try { const u = new URL(v); return ['http:', 'https:'].includes(u.protocol); }
    catch (_) { return false; }
  },
  uuid: (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || '')),
  alphanumeric: (v) => /^[a-zA-Z0-9_-]+$/.test(String(v || '')),
  nonEmpty: (v) => v != null && String(v).trim().length > 0,
  maxLength: (max) => (v) => String(v || '').length <= max,
  minLength: (min) => (v) => String(v || '').length >= min,
  number: (v) => !isNaN(Number(v)) && isFinite(Number(v)),
  integer: (v) => Number.isInteger(Number(v)),
};

/**
 * Validate object against schema.
 * Schema: { fieldName: [validatorFn, ...] }
 */
function validate(obj, schema) {
  const errors = {};
  for (const [field, rules] of Object.entries(schema)) {
    const value = obj?.[field];
    const ruleArr = Array.isArray(rules) ? rules : [rules];
    for (const rule of ruleArr) {
      if (typeof rule === 'function') {
        if (!rule(value)) {
          errors[field] = `Invalid ${field}`;
          break;
        }
      } else if (typeof rule === 'object' && rule.fn && !rule.fn(value)) {
        errors[field] = rule.message || `Invalid ${field}`;
        break;
      }
    }
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Express middleware: validate request body.
 */
function validateBody(schema) {
  return (req, res, next) => {
    const result = validate(req.body || {}, schema);
    if (!result.valid) {
      return res.status(400).json({ error: 'Validation failed', errors: result.errors });
    }
    next();
  };
}

module.exports = {
  applySecurityMiddleware,
  createRateLimiters,
  sanitizeInput,
  detectThreats,
  isSafe,
  validators,
  validate,
  validateBody,
};