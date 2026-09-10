// ============================================================
// 🎯 services/adaptive.js — Adaptive Intelligence
// Learns from usage: tracks success rates, suggests workflows,
// optimizes orchestration based on historical patterns.
// ============================================================

class AdaptiveService {
  constructor(db) {
    this.db = db;
    this.initSchema();
  }

  initSchema() {
    // Track outcomes of operations for learning
    this.db.prepare(`CREATE TABLE IF NOT EXISTS outcomes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      operation TEXT NOT NULL,
      task_type TEXT,
      provider TEXT,
      model TEXT,
      success INTEGER DEFAULT 1,
      score INTEGER,
      duration_ms INTEGER,
      created_at INTEGER NOT NULL
    )`).run();

    // Track user workflow patterns
    this.db.prepare(`CREATE TABLE IF NOT EXISTS workflow_patterns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      pattern_signature TEXT NOT NULL,
      pattern_data TEXT,
      frequency INTEGER DEFAULT 1,
      last_used INTEGER,
      UNIQUE(user_id, pattern_signature)
    )`).run();

    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_outcomes_op ON outcomes(operation, created_at)`).run();
    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_outcomes_user ON outcomes(user_id, created_at)`).run();
  }

  // ─── Record an outcome ────────────────────
  record({ user_id, operation, task_type, provider, model, success = true, score = null, duration_ms = 0 }) {
    try {
      this.db.prepare(`INSERT INTO outcomes (user_id, operation, task_type, provider, model, success, score, duration_ms, created_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(user_id || null, operation, task_type || null, provider || null, model || null, success ? 1 : 0, score, duration_ms, Date.now());
    } catch (_) {}
  }

  // ─── Get best provider/model for a task ───
  bestForTask(taskType, since = null) {
    try {
      const sinceTs = since || (Date.now() - 7 * 24 * 60 * 60 * 1000);
      const rows = this.db.prepare(`
        SELECT provider, model,
               COUNT(*) as count,
               SUM(success) as success_count,
               AVG(duration_ms) as avg_duration,
               AVG(COALESCE(score, 70)) as avg_score
        FROM outcomes
        WHERE task_type = ? AND created_at >= ?
        GROUP BY provider, model
        HAVING count >= 3
        ORDER BY (success_count * 1.0 / count) DESC, avg_score DESC
        LIMIT 5
      `).all(taskType, sinceTs);

      return rows.map(r => ({
        provider: r.provider,
        model: r.model,
        success_rate: ((r.success_count / r.count) * 100).toFixed(1) + '%',
        avg_duration_ms: Math.round(r.avg_duration),
        avg_score: Math.round(r.avg_score),
        sample_size: r.count,
      }));
    } catch (_) { return []; }
  }

  // ─── Get user's frequent workflows ────────
  recordWorkflow(userId, signature, data = {}) {
    try {
      this.db.prepare(`INSERT INTO workflow_patterns (user_id, pattern_signature, pattern_data, frequency, last_used)
                       VALUES (?, ?, ?, 1, ?)
                       ON CONFLICT(user_id, pattern_signature) DO UPDATE SET
                       frequency = frequency + 1, last_used = excluded.last_used,
                       pattern_data = excluded.pattern_data`)
        .run(userId, signature, JSON.stringify(data), Date.now());
    } catch (_) {}
  }

  getUserPatterns(userId, limit = 10) {
    try {
      return this.db.prepare(`SELECT pattern_signature, pattern_data, frequency, last_used FROM workflow_patterns
                              WHERE user_id = ?
                              ORDER BY frequency DESC, last_used DESC
                              LIMIT ?`)
        .all(userId, limit)
        .map(r => ({ ...r, pattern_data: this._parse(r.pattern_data) }));
    } catch (_) { return []; }
  }

  // ─── Suggest next action based on history ─
  suggestNext(userId) {
    try {
      const recent = this.db.prepare(`SELECT operation, COUNT(*) as count FROM outcomes
                                      WHERE user_id = ? AND created_at >= ?
                                      GROUP BY operation
                                      ORDER BY count DESC LIMIT 5`)
        .all(userId, Date.now() - 7 * 24 * 60 * 60 * 1000);

      const patterns = this.getUserPatterns(userId, 3);

      return {
        frequent_operations: recent,
        common_patterns: patterns,
        suggestion: recent[0] ? `You often run "${recent[0].operation}" — want to try it again?` : null,
      };
    } catch (_) { return { frequent_operations: [], common_patterns: [] }; }
  }

  // ─── Stats: success rate per provider ────
  providerStats(since = null) {
    try {
      const sinceTs = since || (Date.now() - 24 * 60 * 60 * 1000);
      return this.db.prepare(`SELECT provider, COUNT(*) as total, SUM(success) as successful, AVG(duration_ms) as avg_duration
                              FROM outcomes
                              WHERE created_at >= ? AND provider IS NOT NULL
                              GROUP BY provider`)
        .all(sinceTs)
        .map(r => ({
          provider: r.provider,
          total: r.total,
          success_rate: ((r.successful / r.total) * 100).toFixed(1) + '%',
          avg_duration_ms: Math.round(r.avg_duration),
        }));
    } catch (_) { return []; }
  }

  // ─── User productivity stats ──────────────
  userStats(userId) {
    try {
      const sinceTs = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const total = this.db.prepare(`SELECT COUNT(*) as c FROM outcomes WHERE user_id = ? AND created_at >= ?`).get(userId, sinceTs);
      const success = this.db.prepare(`SELECT COUNT(*) as c FROM outcomes WHERE user_id = ? AND success = 1 AND created_at >= ?`).get(userId, sinceTs);
      const ops = this.db.prepare(`SELECT operation, COUNT(*) as c FROM outcomes WHERE user_id = ? AND created_at >= ? GROUP BY operation ORDER BY c DESC LIMIT 5`).all(userId, sinceTs);
      return {
        last_30_days: total.c,
        successful: success.c,
        success_rate: total.c > 0 ? ((success.c / total.c) * 100).toFixed(1) + '%' : 'N/A',
        top_operations: ops,
      };
    } catch (_) { return {}; }
  }

  _parse(s) {
    try { return JSON.parse(s); } catch (_) { return s; }
  }
}

module.exports = { AdaptiveService };