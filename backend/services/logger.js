// ============================================================
// 📋 services/logger.js — Production logging with levels
// ============================================================
const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const COLORS = { debug: '\x1b[90m', info: '\x1b[36m', warn: '\x1b[33m', error: '\x1b[31m' };
const RESET = '\x1b[0m';

class Logger {
  constructor(options = {}) {
    this.level = LEVELS[options.level || process.env.LOG_LEVEL || 'info'] ?? 1;
    this.context = options.context || 'NexusAI';
    this.db = options.db;

    if (this.db) {
      try {
        this.db.prepare(`CREATE TABLE IF NOT EXISTS app_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          level TEXT NOT NULL,
          context TEXT,
          message TEXT NOT NULL,
          metadata TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        )`).run();
        this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_app_logs_level ON app_logs(level, created_at)`).run();
      } catch (_) {}
    }
  }

  log(level, message, metadata) {
    if (LEVELS[level] < this.level) return;

    const ts = new Date().toISOString();
    const meta = metadata ? ' ' + JSON.stringify(metadata).slice(0, 500) : '';
    console.log(`${COLORS[level]}[${ts}] [${level.toUpperCase()}] [${this.context}]${RESET} ${message}${meta}`);

    if (this.db && (level === 'error' || level === 'warn')) {
      try {
        this.db.prepare(`INSERT INTO app_logs (level, context, message, metadata) VALUES (?, ?, ?, ?)`)
          .run(level, this.context, message, metadata ? JSON.stringify(metadata) : null);
      } catch (_) {}
    }
  }

  debug(msg, meta) { this.log('debug', msg, meta); }
  info(msg, meta) { this.log('info', msg, meta); }
  warn(msg, meta) { this.log('warn', msg, meta); }
  error(msg, meta) { this.log('error', msg, meta); }

  child(context) {
    return new Logger({ level: Object.keys(LEVELS).find(k => LEVELS[k] === this.level), context, db: this.db });
  }

  async getRecent(level = null, limit = 100) {
    if (!this.db) return [];
    try {
      const sql = level
        ? `SELECT * FROM app_logs WHERE level = ? ORDER BY id DESC LIMIT ?`
        : `SELECT * FROM app_logs ORDER BY id DESC LIMIT ?`;
      return level ? this.db.prepare(sql).all(level, limit) : this.db.prepare(sql).all(limit);
    } catch (_) { return []; }
  }
}

module.exports = { Logger };