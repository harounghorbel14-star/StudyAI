// ============================================================
// 🛡️ services/security.js — Input validation, sanitization
// ============================================================

function sanitizeInput(input, options = {}) {
  if (input == null) return '';
  let str = String(input);

  const maxLen = options.maxLength || 10000;
  if (str.length > maxLen) str = str.slice(0, maxLen);

  if (options.stripHtml !== false) {
    str = str.replace(/<script[\s\S]*?<\/script>/gi, '')
             .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
             .replace(/javascript:/gi, '')
             .replace(/on\w+\s*=/gi, '');
  }

  return str;
}

function detectThreats(input) {
  const str = String(input || '');
  return {
    has_script_tag: /<script[\s\S]*?>/i.test(str),
    has_sql_injection: /(\bunion\s+select\b|\bdrop\s+table\b|;\s*--|\/\*\s*\*\/)/i.test(str),
    has_path_traversal: /(\.\.\/|\.\.\\)/i.test(str),
    has_pii: /(\b\d{3}-\d{2}-\d{4}\b|\b\d{16}\b|password\s*[:=]\s*\S)/i.test(str),
    too_long: str.length > 50000,
    has_command_injection: /(\$\(|`|\|\s*sh\b|;\s*rm\s+)/i.test(str),
  };
}

function isSafe(input) {
  const threats = detectThreats(input);
  return !Object.values(threats).some(v => v === true);
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function validateUrl(url) {
  try {
    const u = new URL(url);
    return ['http:', 'https:'].includes(u.protocol);
  } catch (_) { return false; }
}

function rateLimitKey(req) {
  return req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`;
}

// Simple in-memory rate limiter
const rateLimits = new Map();
function checkRateLimit(key, limit = 60, windowSec = 60) {
  const now = Date.now();
  const windowStart = now - windowSec * 1000;

  let entries = rateLimits.get(key) || [];
  entries = entries.filter(t => t > windowStart);

  if (entries.length >= limit) {
    const oldestRequest = entries[0];
    const resetIn = Math.ceil((oldestRequest + windowSec * 1000 - now) / 1000);
    return { allowed: false, resetIn, remaining: 0 };
  }

  entries.push(now);
  rateLimits.set(key, entries);
  return { allowed: true, remaining: limit - entries.length, resetIn: 0 };
}

// Cleanup rate limit entries every 5 min
setInterval(() => {
  const now = Date.now();
  for (const [key, entries] of rateLimits.entries()) {
    const filtered = entries.filter(t => t > now - 600000);
    if (filtered.length) rateLimits.set(key, filtered);
    else rateLimits.delete(key);
  }
}, 5 * 60 * 1000);

module.exports = {
  sanitizeInput,
  detectThreats,
  isSafe,
  validateEmail,
  validateUrl,
  rateLimitKey,
  checkRateLimit,
};