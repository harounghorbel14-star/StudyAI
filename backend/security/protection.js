// ============================================================
// 🚨 security/protection.js — Advanced Threat Protection
// Bot detection · Abuse prevention · Anomaly detection
// ============================================================

class ProtectionService {
  constructor(db, options = {}) {
    this.db = db;
    this.logger = options.logger;
    this.events = options.events;
    this.audit = options.audit;
    this.metrics = options.metrics;

    // In-memory tracking (fast)
    this.requestsByIp = new Map();    // ip -> [timestamps]
    this.requestsByUser = new Map();  // user_id -> [timestamps]
    this.failedAuthByIp = new Map();  // ip -> [timestamps]

    // Persisted blocklist
    this.initSchema();
    this.startCleanup();
  }

  initSchema() {
    this.db.prepare(`CREATE TABLE IF NOT EXISTS security_blocklist (
      identifier TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      reason TEXT,
      blocked_until INTEGER,
      blocked_at INTEGER NOT NULL,
      hits INTEGER DEFAULT 0
    )`).run();

    this.db.prepare(`CREATE TABLE IF NOT EXISTS security_anomalies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      severity TEXT,
      identifier TEXT,
      details TEXT,
      created_at INTEGER NOT NULL
    )`).run();

    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_blocklist_expire ON security_blocklist(blocked_until)`).run();
    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_anomalies_kind ON security_anomalies(kind, created_at)`).run();
  }

  // ─── Check if request should be blocked ───
  checkRequest(req) {
    const ip = req.ip;
    const userId = req.user?.id;

    // 1. Blocklist check
    if (this.isBlocked(`ip:${ip}`)) {
      return { allowed: false, reason: 'IP blocked', code: 'BLOCKED_IP' };
    }
    if (userId && this.isBlocked(`user:${userId}`)) {
      return { allowed: false, reason: 'User blocked', code: 'BLOCKED_USER' };
    }

    // 2. Bot/scraper detection
    const ua = req.headers['user-agent'] || '';
    if (this._isSuspiciousUserAgent(ua)) {
      this._recordAnomaly('suspicious_user_agent', 'warning', ip, { ua: ua.slice(0, 200) });
      return { allowed: false, reason: 'Bot detected', code: 'BOT_DETECTED' };
    }

    // 3. Burst detection
    const now = Date.now();
    const recentIp = this._getRecent(this.requestsByIp, ip, 60000);
    if (recentIp.length > 200) {
      this.block(`ip:${ip}`, 'burst', 30 * 60 * 1000); // 30 min block
      this._recordAnomaly('burst_traffic', 'critical', ip, { rps: recentIp.length });
      return { allowed: false, reason: 'Too many requests', code: 'BURST_DETECTED' };
    }
    this._addToRecent(this.requestsByIp, ip, now);

    if (userId) {
      const recentUser = this._getRecent(this.requestsByUser, userId, 60000);
      if (recentUser.length > 500) {
        this.block(`user:${userId}`, 'abuse', 60 * 60 * 1000); // 1h block
        this._recordAnomaly('user_abuse', 'critical', `user:${userId}`, { rps: recentUser.length });
        return { allowed: false, reason: 'Account temporarily limited', code: 'USER_ABUSE' };
      }
      this._addToRecent(this.requestsByUser, userId, now);
    }

    return { allowed: true };
  }

  // ─── Track failed auth (for brute-force detection) ──
  recordFailedAuth(ip, identifier) {
    const now = Date.now();
    this._addToRecent(this.failedAuthByIp, ip, now);

    const recent = this._getRecent(this.failedAuthByIp, ip, 15 * 60 * 1000); // 15 min window
    if (recent.length >= 8) {
      this.block(`ip:${ip}`, 'brute_force', 60 * 60 * 1000); // 1h
      this._recordAnomaly('brute_force', 'critical', ip, { attempts: recent.length, target: identifier });
      this.audit?.log({
        action: 'security.brute_force_blocked',
        ip,
        severity: 'critical',
        success: false,
        metadata: { attempts: recent.length },
      });
    }
  }

  // ─── Block management ─────────────────────
  block(identifier, reason, durationMs = 60 * 60 * 1000) {
    const blockedUntil = Date.now() + durationMs;
    const type = identifier.split(':')[0] || 'unknown';
    try {
      this.db.prepare(`INSERT INTO security_blocklist (identifier, type, reason, blocked_until, blocked_at, hits)
                       VALUES (?, ?, ?, ?, ?, 1)
                       ON CONFLICT(identifier) DO UPDATE SET
                       blocked_until = excluded.blocked_until, reason = excluded.reason, hits = hits + 1`)
        .run(identifier, type, reason, blockedUntil, Date.now());
    } catch (_) {}

    this.events?.emit('security.blocked', { identifier, reason, until: blockedUntil });
    this.metrics?.increment('security_blocks');
  }

  unblock(identifier) {
    try { this.db.prepare(`DELETE FROM security_blocklist WHERE identifier = ?`).run(identifier); } catch (_) {}
  }

  isBlocked(identifier) {
    try {
      const row = this.db.prepare(`SELECT blocked_until FROM security_blocklist WHERE identifier = ?`).get(identifier);
      if (!row) return false;
      if (row.blocked_until < Date.now()) {
        // Expired — auto-cleanup
        this.unblock(identifier);
        return false;
      }
      return true;
    } catch (_) { return false; }
  }

  listBlocked() {
    try {
      return this.db.prepare(`SELECT * FROM security_blocklist WHERE blocked_until > ? ORDER BY blocked_at DESC`)
        .all(Date.now())
        .map(r => ({ ...r, blocked_at: new Date(r.blocked_at).toISOString(), blocked_until: new Date(r.blocked_until).toISOString() }));
    } catch (_) { return []; }
  }

  // ─── Anomaly tracking ─────────────────────
  _recordAnomaly(kind, severity, identifier, details) {
    try {
      this.db.prepare(`INSERT INTO security_anomalies (kind, severity, identifier, details, created_at)
                       VALUES (?, ?, ?, ?, ?)`)
        .run(kind, severity, identifier, JSON.stringify(details || {}), Date.now());
    } catch (_) {}

    this.logger?.warn(`Anomaly: ${kind}`, { severity, identifier });
    this.events?.emit('security.anomaly', { kind, severity, identifier });
  }

  recentAnomalies(limit = 50) {
    try {
      return this.db.prepare(`SELECT * FROM security_anomalies ORDER BY created_at DESC LIMIT ?`)
        .all(limit)
        .map(r => ({ ...r, details: this._parse(r.details), created_at: new Date(r.created_at).toISOString() }));
    } catch (_) { return []; }
  }

  // ─── Express middleware ───────────────────
  middleware() {
    return (req, res, next) => {
      const check = this.checkRequest(req);
      if (!check.allowed) {
        this.audit?.log({
          user_id: req.user?.id,
          action: 'security.request_blocked',
          ip: req.ip,
          metadata: { reason: check.reason, code: check.code, path: req.path },
          severity: 'warning',
          success: false,
        });
        return res.status(429).json({ error: check.reason, code: check.code });
      }
      next();
    };
  }

  // ─── Helpers ──────────────────────────────
  _isSuspiciousUserAgent(ua) {
    if (!ua || ua.length < 5) return true; // empty UAs are suspicious
    const lower = ua.toLowerCase();
    const bots = ['bot', 'crawler', 'spider', 'scraper', 'curl/', 'wget/', 'python-requests', 'go-http-client'];
    // Allow common search engines
    const allowed = ['googlebot', 'bingbot', 'slackbot', 'twitterbot', 'facebookexternalhit'];
    if (allowed.some(a => lower.includes(a))) return false;
    return bots.some(b => lower.includes(b));
  }

  _getRecent(map, key, windowMs) {
    const arr = map.get(key) || [];
    const cutoff = Date.now() - windowMs;
    const recent = arr.filter(t => t > cutoff);
    if (recent.length !== arr.length) map.set(key, recent);
    return recent;
  }

  _addToRecent(map, key, ts) {
    const arr = map.get(key) || [];
    arr.push(ts);
    if (arr.length > 1000) arr.shift();
    map.set(key, arr);
  }

  _parse(s) { try { return JSON.parse(s || '{}'); } catch (_) { return s; } }

  // ─── Cleanup ──────────────────────────────
  startCleanup() {
    setInterval(() => {
      try {
        // Remove expired blocks
        this.db.prepare(`DELETE FROM security_blocklist WHERE blocked_until < ?`).run(Date.now());
        // Remove old anomalies (keep 30 days)
        const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
        this.db.prepare(`DELETE FROM security_anomalies WHERE created_at < ?`).run(cutoff);
      } catch (_) {}

      // Trim in-memory maps
      const now = Date.now();
      const cutoff5min = now - 5 * 60 * 1000;
      for (const map of [this.requestsByIp, this.requestsByUser, this.failedAuthByIp]) {
        for (const [k, v] of map.entries()) {
          const filtered = v.filter(t => t > cutoff5min);
          if (filtered.length === 0) map.delete(k);
          else if (filtered.length !== v.length) map.set(k, filtered);
        }
      }
    }, 5 * 60 * 1000);
  }
}

module.exports = { ProtectionService };