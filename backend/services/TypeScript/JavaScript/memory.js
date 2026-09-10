// ============================================================
// 🧠 services/memory.js — Memory as Operating System Brain
// Long-term, semantic graph, project relationships,
// shared agent memory, execution history
// ============================================================

class MemoryService {
  constructor(db) {
    this.db = db;
    this.initSchema();
  }

  initSchema() {
    // Long-term key-value memory per user
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

    // Shared bus (agent-to-agent messages within an orchestration)
    this.db.prepare(`CREATE TABLE IF NOT EXISTS shared_bus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orchestration_id TEXT NOT NULL,
      from_agent TEXT,
      to_agent TEXT,
      message_type TEXT,
      payload TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`).run();

    // Memory graph — relationships between projects, concepts, executions
    this.db.prepare(`CREATE TABLE IF NOT EXISTS memory_nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      node_type TEXT NOT NULL,
      node_key TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, node_type, node_key)
    )`).run();

    this.db.prepare(`CREATE TABLE IF NOT EXISTS memory_edges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      from_node INTEGER NOT NULL,
      to_node INTEGER NOT NULL,
      relation TEXT NOT NULL,
      weight REAL DEFAULT 1.0,
      created_at TEXT DEFAULT (datetime('now'))
    )`).run();

    // Execution history (resumable workflows, completion state)
    this.db.prepare(`CREATE TABLE IF NOT EXISTS execution_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      workflow_id TEXT NOT NULL,
      step_id TEXT NOT NULL,
      step_data TEXT,
      status TEXT DEFAULT 'pending',
      result TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT
    )`).run();

    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_lt_user ON lt_memory(user_id, category)`).run();
    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_bus_orch ON shared_bus(orchestration_id)`).run();
    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_nodes_user ON memory_nodes(user_id, node_type)`).run();
    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_edges_from ON memory_edges(user_id, from_node)`).run();
    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_history_workflow ON execution_history(workflow_id)`).run();
  }

  // ─── Long-term memory ─────────────────────
  remember(userId, category, key, value, importance = 5) {
    this.db.prepare(`INSERT INTO lt_memory (user_id, category, key, value, importance)
                     VALUES (?, ?, ?, ?, ?)
                     ON CONFLICT(user_id, category, key) DO UPDATE SET
                     value = excluded.value, importance = excluded.importance, last_used_at = datetime('now')`)
      .run(userId, category, key, String(value), importance);
  }

  recall(userId, category, key) {
    const row = this.db.prepare(`SELECT value FROM lt_memory WHERE user_id = ? AND category = ? AND key = ?`).get(userId, category, key);
    if (row) {
      this.db.prepare(`UPDATE lt_memory SET hits = hits + 1, last_used_at = datetime('now') WHERE user_id = ? AND category = ? AND key = ?`)
        .run(userId, category, key);
      return row.value;
    }
    return null;
  }

  list(userId, category, limit = 20) {
    return this.db.prepare(`SELECT key, value, importance, hits, created_at FROM lt_memory
                            WHERE user_id = ? AND category = ?
                            ORDER BY importance DESC, hits DESC LIMIT ?`).all(userId, category, limit);
  }

  forget(userId, category, key) {
    this.db.prepare(`DELETE FROM lt_memory WHERE user_id = ? AND category = ? AND key = ?`).run(userId, category, key);
  }

  // ─── Shared bus (agents in same orchestration) ───
  publish(orchestrationId, fromAgent, toAgent, messageType, payload) {
    this.db.prepare(`INSERT INTO shared_bus (orchestration_id, from_agent, to_agent, message_type, payload)
                     VALUES (?, ?, ?, ?, ?)`)
      .run(orchestrationId, fromAgent, toAgent || 'all', messageType, JSON.stringify(payload));
  }

  consume(orchestrationId, agentName) {
    return this.db.prepare(`SELECT from_agent, message_type, payload, created_at FROM shared_bus
                            WHERE orchestration_id = ? AND (to_agent = ? OR to_agent = 'all')
                            ORDER BY id ASC`).all(orchestrationId, agentName)
      .map(r => ({ from: r.from_agent, type: r.message_type, payload: this._safeParse(r.payload), at: r.created_at }));
  }

  // ─── Memory graph (semantic relationships) ───
  addNode(userId, nodeType, nodeKey, content, metadata = {}) {
    const result = this.db.prepare(`INSERT INTO memory_nodes (user_id, node_type, node_key, content, metadata)
                                    VALUES (?, ?, ?, ?, ?)
                                    ON CONFLICT(user_id, node_type, node_key) DO UPDATE SET
                                    content = excluded.content, metadata = excluded.metadata
                                    RETURNING id`)
      .get(userId, nodeType, nodeKey, String(content), JSON.stringify(metadata));
    return result?.id;
  }

  addEdge(userId, fromNodeId, toNodeId, relation, weight = 1.0) {
    this.db.prepare(`INSERT INTO memory_edges (user_id, from_node, to_node, relation, weight)
                     VALUES (?, ?, ?, ?, ?)`)
      .run(userId, fromNodeId, toNodeId, relation, weight);
  }

  getRelated(userId, nodeId, depth = 1, limit = 20) {
    if (depth <= 0) return [];
    const direct = this.db.prepare(`SELECT n.id, n.node_type, n.node_key, n.content, e.relation, e.weight
                                    FROM memory_edges e
                                    JOIN memory_nodes n ON n.id = e.to_node
                                    WHERE e.user_id = ? AND e.from_node = ?
                                    ORDER BY e.weight DESC LIMIT ?`)
      .all(userId, nodeId, limit);

    if (depth === 1) return direct;

    // Recurse with reduced limit
    const all = [...direct];
    for (const d of direct) {
      const sub = this.getRelated(userId, d.id, depth - 1, Math.max(3, Math.floor(limit / 4)));
      all.push(...sub);
    }
    return all;
  }

  searchNodes(userId, queryText, limit = 10) {
    // Simple keyword search; for production, use FTS5 or vector search
    const q = `%${String(queryText).toLowerCase()}%`;
    return this.db.prepare(`SELECT id, node_type, node_key, content
                            FROM memory_nodes
                            WHERE user_id = ? AND (LOWER(content) LIKE ? OR LOWER(node_key) LIKE ?)
                            LIMIT ?`).all(userId, q, q, limit);
  }

  // ─── Execution history (resumable workflows) ───
  recordStep(userId, workflowId, stepId, stepData, status = 'completed', result = null) {
    this.db.prepare(`INSERT INTO execution_history (user_id, workflow_id, step_id, step_data, status, result, completed_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(userId, workflowId, stepId, JSON.stringify(stepData || {}), status, result ? JSON.stringify(result) : null, status === 'completed' ? new Date().toISOString() : null);
  }

  getWorkflowState(workflowId) {
    return this.db.prepare(`SELECT step_id, status, result FROM execution_history WHERE workflow_id = ? ORDER BY id`)
      .all(workflowId)
      .map(s => ({ ...s, result: s.result ? this._safeParse(s.result) : null }));
  }

  // ─── Build context for AI calls ─────────
  buildContext(userId, options = {}) {
    try {
      const profile = this._safeGet(`SELECT * FROM user_style_profile WHERE user_id = ?`, [userId]);
      const goals = this.list(userId, 'goals', 5);
      const projects = this._safeGet(`SELECT name, idea FROM agent_projects WHERE user_id = ? ORDER BY created_at DESC LIMIT 3`, [userId], true);
      const preferences = this.list(userId, 'preferences', 8);
      const recentNodes = this.db.prepare(`SELECT node_type, content FROM memory_nodes WHERE user_id = ? ORDER BY created_at DESC LIMIT 5`).all(userId);

      if (!profile && !goals.length && !projects?.length && !recentNodes.length) return '';

      const parts = ['[USER CONTEXT]'];
      if (profile) {
        parts.push(`Style: ${profile.communication_style || 'standard'} · Tone: ${profile.preferred_tone || 'neutral'} · Level: ${profile.technical_level || 'mixed'}`);
      }
      if (goals.length) parts.push(`Active goals: ${goals.map(g => g.value).join(' | ')}`);
      if (projects?.length) parts.push(`Recent projects: ${projects.map(p => p.name).join(', ')}`);
      if (preferences.length) parts.push(`Preferences: ${preferences.slice(0, 5).map(p => `${p.key}=${p.value}`).join(', ')}`);
      if (recentNodes.length && options.includeNodes !== false) {
        parts.push(`Knowledge: ${recentNodes.map(n => `[${n.node_type}] ${String(n.content).slice(0, 80)}`).join(' · ')}`);
      }
      parts.push('[END CONTEXT]');

      return parts.join('\n') + '\n\n';
    } catch (e) {
      return '';
    }
  }

  // ─── Stats ──────────────────────────────
  stats(userId) {
    try {
      const memories = this.db.prepare(`SELECT COUNT(*) as c FROM lt_memory WHERE user_id = ?`).get(userId).c;
      const nodes = this.db.prepare(`SELECT COUNT(*) as c FROM memory_nodes WHERE user_id = ?`).get(userId).c;
      const edges = this.db.prepare(`SELECT COUNT(*) as c FROM memory_edges WHERE user_id = ?`).get(userId).c;
      const workflows = this.db.prepare(`SELECT COUNT(DISTINCT workflow_id) as c FROM execution_history WHERE user_id = ?`).get(userId).c;
      return { memories, graph_nodes: nodes, graph_edges: edges, workflows };
    } catch (_) { return {}; }
  }

  // ─── Helpers ────────────────────────────
  _safeParse(s) {
    try { return JSON.parse(s); } catch (_) { return s; }
  }

  _safeGet(sql, params = [], all = false) {
    try {
      const stmt = this.db.prepare(sql);
      return all ? stmt.all(...params) : stmt.get(...params);
    } catch (_) { return all ? [] : null; }
  }
}

module.exports = { MemoryService };