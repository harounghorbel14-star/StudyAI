// ============================================================
// ⚡ services/cache.js — Smart Cache (Memory + DB, Redis-style)
// Semantic keys, TTL, hit tracking, auto-cleanup
// ============================================================
const crypto = require('crypto');

class SmartCache {
  constructor(db, options = {}) {
    this.db = db;
    this.maxMemorySize = options.maxMemorySize || 500;
    this.defaultTTL = options.defaultTTL || 3600; // seconds
    this.memCache = new Map();

    this.initSchema();
    this.startCleanupInterval();
  }

  initSchema() {
    this.db.prepare(`CREATE TABLE IF NOT EXISTS smart_cache (
      cache_key TEXT PRIMARY KEY,
      response TEXT NOT NULL,
      model TEXT,
      task_type TEXT,
      hits INTEGER DEFAULT 0,
      expires_at INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )`).run();
    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_smart_cache_expires ON smart_cache(expires_at)`).run();
  }

  hashKey(parts) {
    const data = Array.isArray(parts) ? parts.join('||') : String(parts);
    return crypto.createHash('sha256').update(data).digest('hex').slice(0, 24);
  }

  get(keyParts) {
    const key = this.hashKey(keyParts);

    // Memory layer
    const mem = this.memCache.get(key);
    if (mem && mem.expires > Date.now()) return mem.value;
    if (mem) this.memCache.delete(key);

    // DB layer
    try {
      const row = this.db.prepare(`SELECT response FROM smart_cache WHERE cache_key = ? AND expires_at > ?`).get(key, Date.now());
      if (row) {
        this.db.prepare(`UPDATE smart_cache SET hits = hits + 1 WHERE cache_key = ?`).run(key);
        const value = JSON.parse(row.response);
        // Promote to memory
        this.memCache.set(key, { value, expires: Date.now() + 600000 });
        return value;
      }
    } catch (_) {}
    return null;
  }

  set(keyParts, value, options = {}) {
    const key = this.hashKey(keyParts);
    const ttl = options.ttl || this.defaultTTL;
    const expires = Date.now() + ttl * 1000;

    // Memory
    this.memCache.set(key, { value, expires });
    if (this.memCache.size > this.maxMemorySize) {
      const firstKey = this.memCache.keys().next().value;
      this.memCache.delete(firstKey);
    }

    // DB
    try {
      this.db.prepare(`INSERT OR REPLACE INTO smart_cache (cache_key, response, model, task_type, expires_at) VALUES (?, ?, ?, ?, ?)`)
        .run(key, JSON.stringify(value), options.model || null, options.task_type || null, expires);
    } catch (_) {}
  }

  delete(keyParts) {
    const key = this.hashKey(keyParts);
    this.memCache.delete(key);
    try { this.db.prepare(`DELETE FROM smart_cache WHERE cache_key = ?`).run(key); } catch (_) {}
  }

  clear() {
    this.memCache.clear();
    try { this.db.prepare(`DELETE FROM smart_cache`).run(); } catch (_) {}
  }

  stats() {
    try {
      const total = this.db.prepare(`SELECT COUNT(*) as c, SUM(hits) as h FROM smart_cache`).get();
      return {
        memory_size: this.memCache.size,
        db_size: total.c || 0,
        total_hits: total.h || 0,
        max_memory: this.maxMemorySize,
      };
    } catch (_) {
      return { memory_size: this.memCache.size };
    }
  }

  startCleanupInterval() {
    setInterval(() => {
      try { this.db.prepare(`DELETE FROM smart_cache WHERE expires_at < ?`).run(Date.now()); }
      catch (_) {}
      // Also cleanup memory
      const now = Date.now();
      for (const [k, v] of this.memCache.entries()) {
        if (v.expires < now) this.memCache.delete(k);
      }
    }, 5 * 60 * 1000);
  }
}

module.exports = { SmartCache };