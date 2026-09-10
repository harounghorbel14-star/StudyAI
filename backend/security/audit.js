// ============================================================
// 🛡️ security/audit.js — Audit Log System
// Tracks every sensitive action for security/compliance.
// ============================================================

class AuditLogger {
  constructor(db, options = {}) {
    this.db = db;
    this.logger = options.logger;
    this.events = options.events;
    this.retentionDays = options.retentionDays || 90;

    this.initSchema();
    this.startCleanup();
  }

  initSchema() {
    this.db.prepare(`CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      resource TEXT,
      resource_id TEXT,
      ip TEXT,
      user_agent TEXT,
      metadata TEXT,
      severity TEXT DEFAULT 'info',
      success INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL
    )`).run();

    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id, created_at)`).run();
    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action, created_at)`).run();
    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_audit_severity ON audit_log(severity, created_at)`).run();
  }

  // ─── Log an event ─────────────────────────
  log({
    user_id = null,
    action,
    resource = null,
    resource_id = null,
    ip = null,
    user_agent = null,
    metadata = {},
    severity = 'info',
    success = true,
  }) {
    if (!action) return;

    try {
      this.db.prepare(`INSERT INTO audit_log (user_id, action, resource, resource_id, ip, user_agent, metadata, severity, success, created_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(
          user_id,
          action,
          resource,
          resource_id ? String(resource_id) : null,
          ip,
          user_agent ? String(user_agent).slice(0, 200) : null,
          JSON.stringify(metadata).slice(0, 2000),
          severity,
          success ? 1 : 0,
          Date.now()
        );
    } catch (_) {}

    // Emit events for high-severity actions
    if (severity === 'critical' || severity === 'warning') {
      this.events?.emit('audit.suspicious', { user_id, action, resource, severity, ip });
    }
  }

  // ─── Express middleware to auto-extract IP/UA ───
  middleware(action, options = {}) {
    return (req, res, next) => {
      this.log({
        user_id: req.user?.id || null,
        action,
        resource: options.resource || req.path,
        resource_id: options.resource_id ? options.resource_id(req) : null,
        ip: req.ip,
        user_agent: req.headers['user-agent'],
        metadata: options.metadata ? options.metadata(req) : {},
        severity: options.severity || 'info',
      });
      next();
    };
  }

  // ─── Query audit log ──────────────────────
  query({ user_id, action, severity, since, limit = 100 } = {}) {
    let sql = `SELECT * FROM audit_log WHERE 1=1`;
    const params = [];
    if (user_id) { sql += ` AND user_id = ?`; params.push(user_id); }
    if (action)  { sql += ` AND action = ?`;  params.push(action); }
    if (severity){ sql += ` AND severity = ?`;params.push(severity); }
    if (since)   { sql += ` AND created_at >= ?`; params.push(since); }
    sql += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(Math.min(limit, 500));
    try {
      return this.db.prepare(sql).all(...params).map(r => ({
        ...r,
        metadata: this._parse(r.metadata),
      }));
    } catch (_) { return []; }
  }

  // ─── Suspicious activity feed ─────────────
  recentSuspicious(limit = 50) {
    try {
      return this.db.prepare(`SELECT * FROM audit_log WHERE severity IN ('warning','critical') OR success = 0 ORDER BY created_at DESC LIMIT ?`)
        .all(limit)
        .map(r => ({ ...r, metadata: this._parse(r.metadata) }));
    } catch (_) { return []; }
  }

  // ─── Per-user activity summary ────────────
  userActivity(userId, days = 7) {
    const since = Date.now() - days * 24 * 60 * 60 * 1000;
    try {
      const counts = this.db.prepare(`SELECT action, COUNT(*) as count FROM audit_log WHERE user_id = ? AND created_at >= ? GROUP BY action ORDER BY count DESC`).all(userId, since);
      const failures = this.db.prepare(`SELECT COUNT(*) as c FROM audit_log WHERE user_id = ? AND success = 0 AND created_at >= ?`).get(userId, since);
      return { counts, failures: failures?.c || 0, period_days: days };
    } catch (_) { return {}; }
  }

  // ─── Stats ────────────────────────────────
  stats(days = 7) {
    const since = Date.now() - days * 24 * 60 * 60 * 1000;
    try {
      const total = this.db.prepare(`SELECT COUNT(*) as c FROM audit_log WHERE created_at >= ?`).get(since);
      const bySeverity = this.db.prepare(`SELECT severity, COUNT(*) as c FROM audit_log WHERE created_at >= ? GROUP BY severity`).all(since);
      const byAction = this.db.prepare(`SELECT action, COUNT(*) as c FROM audit_log WHERE created_at >= ? GROUP BY action ORDER BY c DESC LIMIT 20`).all(since);
      const failures = this.db.prepare(`SELECT COUNT(*) as c FROM audit_log WHERE success = 0 AND created_at >= ?`).get(since);
      return {
        total: total?.c || 0,
        failures: failures?.c || 0,
        by_severity: bySeverity,
        top_actions: byAction,
      };
    } catch (_) { return {}; }
  }

  // ─── Cleanup old logs ─────────────────────
  startCleanup() {
    setInterval(() => {
      try {
        const cutoff = Date.now() - this.retentionDays * 24 * 60 * 60 * 1000;
        this.db.prepare(`DELETE FROM audit_log WHERE created_at < ?`).run(cutoff);
      } catch (_) {}
    }, 24 * 60 * 60 * 1000);
  }

  _parse(s) {
    try { return JSON.parse(s || '{}'); } catch (_) { return s; }
  }
}

// Standardized audit action names
const AUDIT_ACTIONS = Object.freeze({
  AUTH_LOGIN:        'auth.login',
  AUTH_LOGOUT:       'auth.logout',
  AUTH_FAILED:       'auth.failed',
  AUTH_REGISTER:     'auth.register',
  AUTH_PASSWORD_CHANGE: 'auth.password_change',

  API_KEY_CREATED:   'api_key.created',
  API_KEY_REVOKED:   'api_key.revoked',

  PROJECT_CREATED:   'project.created',
  PROJECT_DELETED:   'project.deleted',
  PROJECT_SHARED:    'project.shared',

  DEPLOY_TRIGGERED:  'deploy.triggered',
  DEPLOY_FAILED:     'deploy.failed',

  PAYMENT_SUCCESS:   'payment.success',
  PAYMENT_FAILED:    'payment.failed',
  SUBSCRIPTION_CHANGED: 'subscription.changed',

  ADMIN_ACTION:      'admin.action',
  DATA_EXPORT:       'data.export',
  DATA_DELETE:       'data.delete',

  SECURITY_VIOLATION:'security.violation',
  ABUSE_DETECTED:    'security.abuse',
  RATE_LIMIT_HIT:    'security.rate_limit',
});

module.exports = { AuditLogger, AUDIT_ACTIONS };