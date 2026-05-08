// ============================================================
// 📋 services/logger.js — Production Logger (pino-based)
// Structured logs, levels, child loggers, fallback to console
// ============================================================

let pino;
try { pino = require('pino'); } catch (_) { pino = null; }

const LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'];

class Logger {
  constructor(options = {}) {
    this.level = options.level || process.env.LOG_LEVEL || 'info';
    this.context = options.context || 'NexusAI';

    if (pino) {
      const config = {
        name: this.context,
        level: this.level,
      };
      // Pretty in dev, JSON in prod
      if (process.env.NODE_ENV !== 'production') {
        try {
          config.transport = {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
          };
        } catch (_) {}
      }
      try {
        this.pino = pino(config);
      } catch (_) {
        this.pino = null;
      }
    }
  }

  _log(level, msg, meta) {
    if (this.pino) {
      const args = meta ? [meta, msg] : [msg];
      this.pino[level]?.(...args);
      return;
    }
    // Fallback console
    const ts = new Date().toISOString();
    const metaStr = meta ? ' ' + JSON.stringify(meta).slice(0, 500) : '';
    const colors = { debug: '\x1b[90m', info: '\x1b[36m', warn: '\x1b[33m', error: '\x1b[31m', fatal: '\x1b[35m' };
    const reset = '\x1b[0m';
    console.log(`${colors[level] || ''}[${ts}] [${level.toUpperCase()}] [${this.context}]${reset} ${msg}${metaStr}`);
  }

  debug(msg, meta) { this._log('debug', msg, meta); }
  info(msg, meta) { this._log('info', msg, meta); }
  warn(msg, meta) { this._log('warn', msg, meta); }
  error(msg, meta) { this._log('error', msg, meta); }
  fatal(msg, meta) { this._log('fatal', msg, meta); }

  child(context) {
    const childCtx = `${this.context}:${context}`;
    if (this.pino) {
      const child = this.pino.child({ context: childCtx });
      const wrapper = new Logger({ level: this.level, context: childCtx });
      wrapper.pino = child;
      return wrapper;
    }
    return new Logger({ level: this.level, context: childCtx });
  }

  // Express middleware
  middleware() {
    return (req, res, next) => {
      const start = Date.now();
      const reqId = Math.random().toString(36).slice(2, 10);
      req.reqId = reqId;
      req.log = this.child(`req:${reqId}`);

      res.on('finish', () => {
        const duration = Date.now() - start;
        const meta = {
          method: req.method,
          path: req.path,
          status: res.statusCode,
          duration_ms: duration,
          ip: req.ip,
          user_id: req.user?.id,
        };
        if (res.statusCode >= 500) this.error('Request failed', meta);
        else if (res.statusCode >= 400) this.warn('Request error', meta);
        else if (duration > 5000) this.warn('Slow request', meta);
        else this.debug('Request', meta);
      });
      next();
    };
  }
}

module.exports = { Logger };