// ============================================================
// 👤 services/shadow-mode.js — Shadow Mode
// AI observes silently, generates suggestions, tracks acceptance.
// Learns from what user actually does vs what shadow proposed.
// ============================================================

class ShadowMode {
  constructor(options) {
    this.db = options.db;
    this.smartCall = options.smartCall;
    this.aiTwin = options.aiTwin;
    this.memoryFabric = options.memoryFabric;
    this.events = options.events;
    this.logger = options.logger;
    this.notifications = options.notifications;
    this.enabled = options.enabled !== false;
    this.suggestionCooldownMs = options.cooldownMs || 5 * 60 * 1000;
    this.initSchema();
  }

  initSchema() {
    if (!this.db) return;

    this.db.prepare(`CREATE TABLE IF NOT EXISTS shadow_suggestions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      trigger_action TEXT,
      suggestion_type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      metadata TEXT,
      confidence REAL DEFAULT 0.5,
      status TEXT DEFAULT 'pending',
      shown_at INTEGER,
      responded_at INTEGER,
      response TEXT,
      created_at INTEGER NOT NULL
    )`).run();

    this.db.prepare(`CREATE TABLE IF NOT EXISTS shadow_observations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      context TEXT,
      shadow_suggested INTEGER DEFAULT 0,
      user_accepted INTEGER,
      created_at INTEGER NOT NULL
    )`).run();

    this.db.prepare(`CREATE TABLE IF NOT EXISTS shadow_prefs (
      user_id INTEGER PRIMARY KEY,
      enabled INTEGER DEFAULT 1,
      quiet_mode INTEGER DEFAULT 0,
      suggestion_types TEXT DEFAULT '[]',
      updated_at INTEGER NOT NULL
    )`).run();

    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_shadow_user
      ON shadow_suggestions(user_id, status, created_at)`).run();
  }

  // ─── Observe an action (learning signal) ──────
  observe({ user_id, action, context = {}, shadow_suggested = false, user_accepted = null }) {
    try {
      this.db.prepare(
        `INSERT INTO shadow_observations (user_id, action, context, shadow_suggested, user_accepted, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(user_id, action, JSON.stringify(context),
            shadow_suggested ? 1 : 0,
            user_accepted === null ? null : (user_accepted ? 1 : 0),
            Date.now());
    } catch (_) {}
  }

  // ─── Generate a suggestion (background) ───────
  async maybeSuggest({ user_id, trigger_action, current_context = {} }) {
    if (!this.enabled) return null;

    const prefs = this.getPrefs(user_id);
    if (!prefs.enabled) return null;
    if (prefs.quiet_mode) return null;

    // Cooldown: don't spam suggestions
    const recent = this.db.prepare(
      `SELECT created_at FROM shadow_suggestions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`
    ).get(user_id);
    if (recent && Date.now() - recent.created_at < this.suggestionCooldownMs) return null;

    try {
      // Ask AI what would be a helpful proactive suggestion
      const twinIdentity = this.aiTwin?.getIdentity(user_id);
      const result = await this.smartCall({
        prompt: `You are a Shadow AI observing a user silently. Given:
- Recent action: ${trigger_action}
- Current context: ${JSON.stringify(current_context).slice(0, 500)}
- User identity: ${JSON.stringify(twinIdentity).slice(0, 500)}

Suggest ONE proactive helpful action the user might not have thought of. Return JSON:
{
  "should_suggest": true/false,
  "type": "insight|reminder|automation|optimization",
  "title": "one-line title",
  "body": "brief actionable body (max 200 chars)",
  "confidence": 0-1
}
If nothing valuable to suggest, set should_suggest to false.`,
        task: 'reasoning-fast',
        json: true,
        cacheable: false,
        user_id,
      });

      const suggestion = result.output;
      if (!suggestion?.should_suggest) return null;
      if ((suggestion.confidence || 0) < 0.6) return null;

      const insertResult = this.db.prepare(
        `INSERT INTO shadow_suggestions (user_id, trigger_action, suggestion_type, title, body, metadata, confidence, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
      ).run(user_id, trigger_action, suggestion.type || 'insight',
            suggestion.title, suggestion.body || '',
            JSON.stringify(current_context), suggestion.confidence, Date.now());

      // Notify (as low-priority in-app notification)
      if (this.notifications) {
        await this.notifications.send({
          user_id, type: 'ai_complete',
          title: `💡 ${suggestion.title}`,
          message: suggestion.body,
          metadata: { shadow_id: insertResult.lastInsertRowid, shadow_type: suggestion.type },
        });
      }

      // Store in memory fabric
      if (this.memoryFabric) {
        this.memoryFabric.remember({
          user_id, node_type: 'shadow_suggestion',
          content: `${suggestion.title}: ${suggestion.body}`,
          metadata: { type: suggestion.type, confidence: suggestion.confidence },
          importance: suggestion.confidence,
        });
      }

      this.events?.emit('shadow.suggested', { user_id, suggestion_id: insertResult.lastInsertRowid });
      return { id: insertResult.lastInsertRowid, ...suggestion };
    } catch (e) {
      this.logger?.warn?.('shadow suggest failed', { err: e.message });
      return null;
    }
  }

  // ─── Get suggestions for user ─────────────────
  list({ user_id, status = null, limit = 20 }) {
    let sql = `SELECT * FROM shadow_suggestions WHERE user_id = ?`;
    const params = [user_id];
    if (status) { sql += ` AND status = ?`; params.push(status); }
    sql += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(limit);
    return this.db.prepare(sql).all(...params).map(s => ({
      ...s,
      metadata: this._parse(s.metadata),
    }));
  }

  respond({ user_id, suggestion_id, response }) {
    const valid = ['accepted', 'dismissed', 'later'];
    if (!valid.includes(response)) throw new Error('Invalid response');
    this.db.prepare(
      `UPDATE shadow_suggestions SET status = ?, responded_at = ?, response = ? WHERE id = ? AND user_id = ?`
    ).run(response, Date.now(), response, suggestion_id, user_id);
    this.events?.emit('shadow.responded', { user_id, suggestion_id, response });
    return { ok: true };
  }

  markShown(user_id, suggestion_id) {
    try {
      this.db.prepare(`UPDATE shadow_suggestions SET shown_at = ? WHERE id = ? AND user_id = ? AND shown_at IS NULL`)
        .run(Date.now(), suggestion_id, user_id);
    } catch (_) {}
  }

  // ─── Preferences ────────────────────────────
  getPrefs(user_id) {
    const row = this.db.prepare(`SELECT * FROM shadow_prefs WHERE user_id = ?`).get(user_id);
    if (!row) {
      try {
        this.db.prepare(`INSERT INTO shadow_prefs (user_id, enabled, quiet_mode, suggestion_types, updated_at) VALUES (?, 1, 0, '[]', ?)`)
          .run(user_id, Date.now());
      } catch (_) {}
      return { user_id, enabled: 1, quiet_mode: 0, suggestion_types: '[]', updated_at: Date.now() };
    }
    return row;
  }

  updatePrefs({ user_id, ...updates }) {
    const current = this.getPrefs(user_id);
    const merged = { ...current, ...updates, updated_at: Date.now() };
    this.db.prepare(
      `UPDATE shadow_prefs SET enabled = ?, quiet_mode = ?, suggestion_types = ?, updated_at = ? WHERE user_id = ?`
    ).run(
      merged.enabled ? 1 : 0,
      merged.quiet_mode ? 1 : 0,
      Array.isArray(merged.suggestion_types) ? JSON.stringify(merged.suggestion_types) : merged.suggestion_types,
      merged.updated_at,
      user_id
    );
    return this.getPrefs(user_id);
  }

  // ─── Learning metrics ───────────────────────
  getStats(user_id = null) {
    try {
      let sql = `SELECT status, COUNT(*) as c FROM shadow_suggestions WHERE 1=1`;
      const params = [];
      if (user_id) { sql += ` AND user_id = ?`; params.push(user_id); }
      sql += ` GROUP BY status`;
      const byStatus = this.db.prepare(sql).all(...params);
      const stats = { pending: 0, accepted: 0, dismissed: 0, later: 0 };
      byStatus.forEach(s => { stats[s.status] = s.c; });
      const total = Object.values(stats).reduce((a, b) => a + b, 0);
      const responded = total - stats.pending;
      return {
        ...stats,
        total,
        acceptance_rate: responded > 0 ? stats.accepted / responded : 0,
      };
    } catch (_) { return { total: 0 }; }
  }

  _parse(s) { try { return JSON.parse(s); } catch (_) { return s || {}; } }
}

module.exports = { ShadowMode };