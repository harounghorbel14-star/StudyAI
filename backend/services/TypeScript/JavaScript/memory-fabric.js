// ============================================================
// 🕸️ services/memory-fabric.js — AI Memory Fabric
// Interconnected memory graph. Relationships between memories,
// contextual retrieval, semantic connections.
// Concept from Documents 16, 18.
// ============================================================
const crypto = require('crypto');

class MemoryFabric {
  constructor(options) {
    this.db = options.db;
    this.smartCall = options.smartCall;
    this.cache = options.cache;
    this.events = options.events;
    this.logger = options.logger;
    this.initSchema();
  }

  initSchema() {
    if (!this.db) return;

    this.db.prepare(`CREATE TABLE IF NOT EXISTS fabric_nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      node_type TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata TEXT,
      importance REAL DEFAULT 0.5,
      access_count INTEGER DEFAULT 0,
      last_accessed INTEGER,
      created_at INTEGER NOT NULL
    )`).run();

    this.db.prepare(`CREATE TABLE IF NOT EXISTS fabric_edges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      from_node INTEGER NOT NULL,
      to_node INTEGER NOT NULL,
      relation TEXT NOT NULL,
      strength REAL DEFAULT 0.5,
      created_at INTEGER NOT NULL
    )`).run();

    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_fabric_user ON fabric_nodes(user_id, node_type)`).run();
    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_fabric_edges ON fabric_edges(user_id, from_node)`).run();
  }

  // ─── Add memory node ───────────────────────
  remember({ user_id, node_type, content, metadata = {}, importance = 0.5 }) {
    try {
      const now = Date.now();
      const result = this.db.prepare(
        `INSERT INTO fabric_nodes (user_id, node_type, content, metadata, importance, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(user_id, node_type, String(content).slice(0, 5000), JSON.stringify(metadata), importance, now);

      this.events?.emit('fabric.remembered', { user_id, node_id: result.lastInsertRowid, node_type });
      return { id: result.lastInsertRowid };
    } catch (e) {
      this.logger?.warn('fabric remember failed', { err: e.message });
      return null;
    }
  }

  // ─── Connect two memory nodes ──────────────
  connect({ user_id, from_node, to_node, relation, strength = 0.5 }) {
    try {
      this.db.prepare(
        `INSERT INTO fabric_edges (user_id, from_node, to_node, relation, strength, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(user_id, from_node, to_node, relation, strength, Date.now());
      return { ok: true };
    } catch (_) { return { ok: false }; }
  }

  // ─── Recall memories relevant to context ──
  async recall({ user_id, query, node_types = null, limit = 10, min_importance = 0.3 }) {
    try {
      let sql = `SELECT id, node_type, content, metadata, importance, access_count FROM fabric_nodes
                 WHERE user_id = ? AND importance >= ?`;
      const params = [user_id, min_importance];
      if (node_types?.length) {
        sql += ` AND node_type IN (${node_types.map(() => '?').join(',')})`;
        params.push(...node_types);
      }
      sql += ` ORDER BY importance DESC, access_count DESC LIMIT ?`;
      params.push(limit * 3);

      const candidates = this.db.prepare(sql).all(...params);

      // Fuzzy relevance ranking
      const queryLower = String(query || '').toLowerCase();
      const scored = candidates.map(n => {
        const contentLower = n.content.toLowerCase();
        let score = n.importance;
        if (queryLower && contentLower.includes(queryLower)) score += 0.3;
        const words = queryLower.split(/\s+/).filter(w => w.length > 2);
        words.forEach(w => { if (contentLower.includes(w)) score += 0.1; });
        return { ...n, relevance: score, metadata: this._parse(n.metadata) };
      });

      const top = scored.sort((a, b) => b.relevance - a.relevance).slice(0, limit);

      // Update access counts
      top.forEach(n => {
        this.db.prepare(`UPDATE fabric_nodes SET access_count = access_count + 1, last_accessed = ? WHERE id = ?`)
          .run(Date.now(), n.id);
      });

      return top;
    } catch (_) { return []; }
  }

  // ─── Get related memories (graph walk) ────
  getRelated({ user_id, node_id, depth = 1, limit = 10 }) {
    try {
      const visited = new Set();
      const results = [];
      const queue = [{ id: node_id, depth: 0 }];

      while (queue.length && results.length < limit) {
        const { id, depth: d } = queue.shift();
        if (visited.has(id) || d > depth) continue;
        visited.add(id);

        if (d > 0) {
          const node = this.db.prepare(`SELECT id, node_type, content, importance FROM fabric_nodes WHERE id = ? AND user_id = ?`).get(id, user_id);
          if (node) results.push({ ...node, depth: d });
        }

        if (d < depth) {
          const edges = this.db.prepare(`SELECT to_node, relation, strength FROM fabric_edges WHERE user_id = ? AND from_node = ? ORDER BY strength DESC`)
            .all(user_id, id);
          edges.forEach(e => queue.push({ id: e.to_node, depth: d + 1 }));
        }
      }

      return results;
    } catch (_) { return []; }
  }

  // ─── Auto-link new memory to existing ─────
  async autoLink({ user_id, node_id }) {
    if (!this.smartCall) return { linked: 0 };
    try {
      const node = this.db.prepare(`SELECT node_type, content FROM fabric_nodes WHERE id = ? AND user_id = ?`).get(node_id, user_id);
      if (!node) return { linked: 0 };

      const recent = this.db.prepare(
        `SELECT id, node_type, content FROM fabric_nodes WHERE user_id = ? AND id != ? ORDER BY created_at DESC LIMIT 20`
      ).all(user_id, node_id);

      if (!recent.length) return { linked: 0 };

      const result = await this.smartCall({
        prompt: `Given this new memory:\nType: ${node.node_type}\nContent: ${node.content.slice(0, 300)}\n\nAnd these existing memories:\n${recent.map((n, i) => `[${i}] ${n.node_type}: ${n.content.slice(0, 150)}`).join('\n')}\n\nReturn JSON with related memories: { links: [{ index, relation, strength: 0-1 }] }`,
        task: 'reasoning-fast',
        json: true,
        cacheable: false,
        user_id,
      });

      let linked = 0;
      const links = result.output?.links || [];
      links.slice(0, 5).forEach(link => {
        const target = recent[link.index];
        if (target && link.strength >= 0.3) {
          this.connect({ user_id, from_node: node_id, to_node: target.id, relation: link.relation, strength: link.strength });
          linked++;
        }
      });
      return { linked };
    } catch (_) { return { linked: 0 }; }
  }

  // ─── Fabric stats ─────────────────────────
  stats(user_id) {
    try {
      const nodes = this.db.prepare(`SELECT COUNT(*) as c FROM fabric_nodes WHERE user_id = ?`).get(user_id)?.c || 0;
      const edges = this.db.prepare(`SELECT COUNT(*) as c FROM fabric_edges WHERE user_id = ?`).get(user_id)?.c || 0;
      const byType = this.db.prepare(`SELECT node_type, COUNT(*) as c FROM fabric_nodes WHERE user_id = ? GROUP BY node_type`).all(user_id);
      return { nodes, edges, density: nodes > 0 ? edges / nodes : 0, by_type: byType };
    } catch (_) { return { nodes: 0, edges: 0 }; }
  }

  _parse(s) { try { return JSON.parse(s); } catch (_) { return s || {}; } }
}

module.exports = { MemoryFabric };