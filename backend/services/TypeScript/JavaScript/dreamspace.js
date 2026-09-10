// ============================================================
// 💤 services/dreamspace.js — AI Dreamspace
// Background worker that runs during user idle time.
// Consolidates memory, generates insights, precomputes optimizations.
// ============================================================

class Dreamspace {
  constructor(options) {
    this.db = options.db;
    this.smartCall = options.smartCall;
    this.memoryFabric = options.memoryFabric;
    this.aiTwin = options.aiTwin;
    this.pmf = options.pmf;
    this.events = options.events;
    this.logger = options.logger;

    this.enabled = options.enabled !== false;
    this.tickInterval = options.tickInterval || 5 * 60 * 1000; // 5 min
    this.idleThresholdMs = options.idleThresholdMs || 15 * 60 * 1000; // 15 min
    this._timer = null;
    this._running = false;
    this.initSchema();
  }

  initSchema() {
    if (!this.db) return;

    this.db.prepare(`CREATE TABLE IF NOT EXISTS dream_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      last_seen INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`).run();

    this.db.prepare(`CREATE TABLE IF NOT EXISTS dream_insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      kind TEXT NOT NULL,
      summary TEXT NOT NULL,
      details TEXT,
      importance REAL DEFAULT 0.5,
      seen INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    )`).run();

    this.db.prepare(`CREATE TABLE IF NOT EXISTS dream_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      run_type TEXT NOT NULL,
      duration_ms INTEGER,
      artifacts_created INTEGER DEFAULT 0,
      metadata TEXT,
      created_at INTEGER NOT NULL
    )`).run();

    this.db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_dream_activity_user
      ON dream_activity(user_id)`).run();
    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_dream_insights_user
      ON dream_insights(user_id, seen, created_at)`).run();
  }

  // ─── Track user activity ─────────────────────
  markActive(user_id) {
    if (!user_id) return;
    const now = Date.now();
    try {
      this.db.prepare(
        `INSERT INTO dream_activity (user_id, last_seen, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET last_seen = excluded.last_seen, updated_at = excluded.updated_at`
      ).run(user_id, now, now);
    } catch (_) {
      // Fallback for non-conflict DBs
      try {
        this.db.prepare(`UPDATE dream_activity SET last_seen = ?, updated_at = ? WHERE user_id = ?`)
          .run(now, now, user_id);
        this.db.prepare(`INSERT OR IGNORE INTO dream_activity (user_id, last_seen, updated_at) VALUES (?, ?, ?)`)
          .run(user_id, now, now);
      } catch (_) {}
    }
  }

  // ─── Start background loop ───────────────────
  start() {
    if (!this.enabled || this._timer) return;
    this._timer = setInterval(() => this._tick().catch(() => {}), this.tickInterval);
    this.logger?.info?.('Dreamspace started', { tick_interval_ms: this.tickInterval });
  }

  stop() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  // ─── Main tick ──────────────────────────────
  async _tick() {
    if (this._running) return;
    this._running = true;

    try {
      const idle = this._findIdleUsers();
      if (!idle.length) return;

      // Process up to 3 idle users per tick
      for (const u of idle.slice(0, 3)) {
        await this._dreamFor(u.user_id).catch(e => this.logger?.warn?.('dream failed', { err: e.message }));
      }
    } finally {
      this._running = false;
    }
  }

  _findIdleUsers() {
    const cutoff = Date.now() - this.idleThresholdMs;
    const active = Date.now() - 24 * 60 * 60 * 1000; // dreamed within last 24h skip
    try {
      return this.db.prepare(
        `SELECT a.user_id FROM dream_activity a
         WHERE a.last_seen < ?
         AND NOT EXISTS (SELECT 1 FROM dream_runs r WHERE r.user_id = a.user_id AND r.created_at > ?)
         ORDER BY a.last_seen ASC LIMIT 10`
      ).all(cutoff, active);
    } catch (_) { return []; }
  }

  // ─── Dream cycle for a user ─────────────────
  async _dreamFor(user_id) {
    const start = Date.now();
    let artifacts = 0;

    try {
      // 1. Memory consolidation
      const consolidated = await this._consolidateMemory(user_id);
      artifacts += consolidated;

      // 2. Pattern insight generation
      const insights = await this._generateInsights(user_id);
      artifacts += insights;

      // 3. Workflow pattern detection
      const workflows = await this._detectWorkflowPatterns(user_id);
      artifacts += workflows;

      this._recordRun({ user_id, run_type: 'nightly', duration_ms: Date.now() - start, artifacts });
      this.events?.emit('dreamspace.completed', { user_id, artifacts });
    } catch (e) {
      this.logger?.warn?.('dream cycle failed', { user_id, err: e.message });
    }
  }

  async _consolidateMemory(user_id) {
    if (!this.memoryFabric || !this.smartCall) return 0;

    try {
      // Get recent unconnected memories
      const recent = this.db.prepare(
        `SELECT id, content FROM fabric_nodes n
         WHERE user_id = ? AND NOT EXISTS (SELECT 1 FROM fabric_edges e WHERE e.from_node = n.id)
         ORDER BY created_at DESC LIMIT 20`
      ).all(user_id);

      if (recent.length < 3) return 0;

      let linked = 0;
      // Auto-link each unconnected memory
      for (const m of recent.slice(0, 5)) {
        const result = await this.memoryFabric.autoLink({ user_id, node_id: m.id }).catch(() => ({ linked: 0 }));
        linked += result.linked || 0;
      }

      return linked;
    } catch (_) { return 0; }
  }

  async _generateInsights(user_id) {
    if (!this.smartCall) return 0;

    try {
      // Get user's recent activity summary
      const recentEvents = this.pmf?.getFeatureAdoption?.({ period_days: 7 }) || [];
      const twinId = this.aiTwin?.getIdentity(user_id);

      if (!recentEvents.length && !twinId?.formed) return 0;

      const result = await this.smartCall({
        prompt: `You are the Dreamspace — the user's AI reflecting on their recent activity while they're idle.

Recent feature use: ${JSON.stringify(recentEvents).slice(0, 500)}
User identity: ${JSON.stringify(twinId).slice(0, 500)}

Generate 1-3 valuable insights the user should see when they return. Return JSON:
{
  "insights": [
    { "kind": "pattern|opportunity|optimization|warning", "summary": "1-line summary", "details": "actionable body", "importance": 0-1 }
  ]
}
Only include high-value insights (importance > 0.5). If nothing valuable, return empty array.`,
        task: 'reasoning-deep',
        json: true,
        cacheable: false,
        user_id,
      });

      const insights = (result.output?.insights || []).filter(i => (i.importance || 0) >= 0.5);

      insights.forEach(i => {
        try {
          this.db.prepare(
            `INSERT INTO dream_insights (user_id, kind, summary, details, importance, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`
          ).run(user_id, i.kind || 'insight', i.summary, i.details || '', i.importance, Date.now());
        } catch (_) {}
      });

      return insights.length;
    } catch (_) { return 0; }
  }

  async _detectWorkflowPatterns(user_id) {
    // Look for repeated action sequences in the twin patterns
    if (!this.aiTwin) return 0;
    try {
      const patterns = this.aiTwin.getPatterns(user_id, { minConfidence: 0.7, limit: 10 });
      // If we find repeated patterns, they could be automation candidates
      return patterns.length > 0 ? 1 : 0;
    } catch (_) { return 0; }
  }

  _recordRun({ user_id, run_type, duration_ms, artifacts }) {
    try {
      this.db.prepare(
        `INSERT INTO dream_runs (user_id, run_type, duration_ms, artifacts_created, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(user_id, run_type, duration_ms, artifacts, JSON.stringify({}), Date.now());
    } catch (_) {}
  }

  // ─── Public API ─────────────────────────────
  getInsights({ user_id, unseen_only = false, limit = 10 }) {
    try {
      let sql = `SELECT id, kind, summary, details, importance, seen, created_at FROM dream_insights WHERE user_id = ?`;
      const params = [user_id];
      if (unseen_only) sql += ` AND seen = 0`;
      sql += ` ORDER BY importance DESC, created_at DESC LIMIT ?`;
      params.push(limit);
      return this.db.prepare(sql).all(...params);
    } catch (_) { return []; }
  }

  markInsightSeen(user_id, insight_id) {
    try {
      this.db.prepare(`UPDATE dream_insights SET seen = 1 WHERE id = ? AND user_id = ?`)
        .run(insight_id, user_id);
      return { ok: true };
    } catch (_) { return { ok: false }; }
  }

  getRuns(user_id, limit = 20) {
    try {
      return this.db.prepare(
        `SELECT run_type, duration_ms, artifacts_created, created_at FROM dream_runs
         WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`
      ).all(user_id, limit);
    } catch (_) { return []; }
  }

  stats(user_id = null) {
    try {
      let sql = `SELECT COUNT(*) as runs, SUM(artifacts_created) as artifacts FROM dream_runs`;
      const params = [];
      if (user_id) { sql += ` WHERE user_id = ?`; params.push(user_id); }
      const r = this.db.prepare(sql).all(...params)[0];
      return {
        total_runs: r.runs || 0,
        total_artifacts: r.artifacts || 0,
        enabled: this.enabled,
      };
    } catch (_) { return { total_runs: 0 }; }
  }
}

module.exports = { Dreamspace };