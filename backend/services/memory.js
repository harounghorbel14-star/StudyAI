// ============================================================
// 🧠 services/memory.js — Shared Memory Bus + Long-Term Memory
// Per-user persistence, agent collaboration, project context
// ============================================================

class MemoryService {
  constructor(db) {
    this.db = db;
    this.initSchema();
  }

  initSchema() {
    this.db.prepare(`CREATE TABLE IF NOT EXISTS lt_memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      importance INTEGER DEFAULT 5,
      hits INTEGER DEFAULT 0,
      last_used_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, category, key)
    )`).run();

    this.db.prepare(`CREATE TABLE IF NOT EXISTS shared_bus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orchestration_id TEXT NOT NULL,
      from_agent TEXT,
      to_agent TEXT,
      message_type TEXT,
      payload TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`).run();

    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_lt_memory_user ON lt_memory(user_id, category)`).run();
    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_shared_bus_orch ON shared_bus(orchestration_id)`).run();
  }

  // Long-term memory ────────────────────────
  remember(userId, category, key, value, importance = 5) {
    this.db.prepare(`INSERT INTO lt_memory (user_id, category, key, value, importance)
                     VALUES (?, ?, ?, ?, ?)
                     ON CONFLICT(user_id, category, key) DO UPDATE SET
                     value = excluded.value, importance = excluded.importance, last_used_at = datetime('now')`)
      .run(userId, category, key, String(value), importance);
  }

  recall(userId, category, key) {
    const row = this.db.prepare(`SELECT value FROM lt_memory WHERE user_id = ? AND category = ? AND key = ?`)
      .get(userId, category, key);
    if (row) {
      this.db.prepare(`UPDATE lt_memory SET hits = hits + 1, last_used_at = datetime('now')
                       WHERE user_id = ? AND category = ? AND key = ?`).run(userId, category, key);
      return row.value;
    }
    return null;
  }

  list(userId, category, limit = 20) {
    return this.db.prepare(`SELECT key, value, importance, hits, created_at FROM lt_memory
                            WHERE user_id = ? AND category = ?
                            ORDER BY importance DESC, hits DESC LIMIT ?`)
      .all(userId, category, limit);
  }

  buildContext(userId, maxItems = 30) {
    try {
      const profile = this.db.prepare(`SELECT * FROM user_style_profile WHERE user_id = ?`).get(userId);
      const goals = this.list(userId, 'goals', 5);
      const projects = this.db.prepare(`SELECT name, idea FROM agent_projects WHERE user_id = ? ORDER BY created_at DESC LIMIT 3`).all(userId);
      const preferences = this.list(userId, 'preferences', 10);

      if (!profile && !goals.length && !projects.length) return '';

      const parts = ['[USER CONTEXT]'];
      if (profile) {
        parts.push(`Style: ${profile.communication_style || 'standard'} · Tone: ${profile.preferred_tone || 'neutral'} · Level: ${profile.technical_level || 'mixed'}`);
      }
      if (goals.length) parts.push(`Goals: ${goals.map(g => g.value).join(' | ')}`);
      if (projects.length) parts.push(`Projects: ${projects.map(p => p.name).join(', ')}`);
      if (preferences.length) parts.push(`Prefs: ${preferences.slice(0, 5).map(p => `${p.key}=${p.value}`).join(', ')}`);
      parts.push('[END]');

      return parts.join('\n') + '\n\n';
    } catch (e) {
      return '';
    }
  }

  // Shared bus (agent-to-agent communication) ─────────
  publish(orchestrationId, fromAgent, toAgent, messageType, payload) {
    this.db.prepare(`INSERT INTO shared_bus (orchestration_id, from_agent, to_agent, message_type, payload)
                     VALUES (?, ?, ?, ?, ?)`)
      .run(orchestrationId, fromAgent, toAgent || 'all', messageType, JSON.stringify(payload));
  }

  consume(orchestrationId, agentName) {
    return this.db.prepare(`SELECT from_agent, message_type, payload FROM shared_bus
                            WHERE orchestration_id = ? AND (to_agent = ? OR to_agent = 'all')
                            ORDER BY id ASC`)
      .all(orchestrationId, agentName)
      .map(r => ({ from: r.from_agent, type: r.message_type, payload: JSON.parse(r.payload || '{}') }));
  }
}

module.exports = { MemoryService };