// ============================================================
// ⚡ services/cache.js — Production Cache Layer
// Upstash Redis (primary) → Memory LRU (fallback)
// Semantic keys, TTL, hit tracking, invalidation
// ============================================================
const crypto = require('crypto');

let UpstashRedis = null;
try {
  UpstashRedis = require('@upstash/redis').Redis;
} catch (_) { /* upstash optional */ }

class SmartCache {
  constructor(options = {}) {
    this.maxMemorySize = options.maxMemorySize || 500;
    this.defaultTTL = options.defaultTTL || 3600;
    this.namespace = options.namespace || 'nx';
    this.memCache = new Map();
    this.stats_ = { hits: 0, misses: 0, sets: 0, redis_errors: 0 };

    // Init Redis
    this.redis = null;
    if (UpstashRedis && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      try {
        this.redis = new UpstashRedis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
        this.redisAvailable = true;
      } catch (e) {
        console.warn('[cache] Upstash init failed:', e.message);
      }
    }

    // Memory cleanup
    setInterval(() => this.cleanupMemory(), 60 * 1000);
  }

  // ─── Semantic key generation ─────────────
  hashKey(parts) {
    const data = Array.isArray(parts) ? parts.join('||') : String(parts);
    const hash = crypto.createHash('sha256').update(data).digest('hex').slice(0, 24);
    return `${this.namespace}:${hash}`;
  }

  // ─── GET ─────────────────────────────────
  async get(keyParts) {
    const key = this.hashKey(keyParts);

    // L1: Memory
    const mem = this.memCache.get(key);
    if (mem && mem.expires > Date.now()) {
      this.stats_.hits++;
      return mem.value;
    }
    if (mem) this.memCache.delete(key);

    // L2: Redis
    if (this.redis) {
      try {
        const raw = await this.redis.get(key);
        if (raw) {
          const value = typeof raw === 'string' ? this._safeParse(raw) : raw;
          // Promote to memory
          this.memCache.set(key, { value, expires: Date.now() + 600000 });
          this._enforceMemorySize();
          this.stats_.hits++;
          return value;
        }
      } catch (e) {
        this.stats_.redis_errors++;
      }
    }

    this.stats_.misses++;
    return null;
  }

  // ─── SET ─────────────────────────────────
  async set(keyParts, value, options = {}) {
    const key = this.hashKey(keyParts);
    const ttl = options.ttl || this.defaultTTL;
    const expires = Date.now() + ttl * 1000;

    this.stats_.sets++;

    // L1: Memory
    this.memCache.set(key, { value, expires });
    this._enforceMemorySize();

    // L2: Redis
    if (this.redis) {
      try {
        await this.redis.set(key, JSON.stringify(value), { ex: ttl });
      } catch (e) {
        this.stats_.redis_errors++;
      }
    }
    return true;
  }

  // ─── DELETE ──────────────────────────────
  async delete(keyParts) {
    const key = this.hashKey(keyParts);
    this.memCache.delete(key);
    if (this.redis) {
      try { await this.redis.del(key); }
      catch (_) { this.stats_.redis_errors++; }
    }
  }

  // ─── INVALIDATE BY PREFIX ────────────────
  async invalidatePrefix(prefix) {
    // Clear from memory
    for (const k of this.memCache.keys()) {
      if (k.includes(prefix)) this.memCache.delete(k);
    }
    // Note: Upstash REST doesn't support SCAN, so only memory is cleared by prefix.
    // For full Redis SCAN, ioredis would be needed.
  }

  // ─── CLEAR ALL ───────────────────────────
  async clear() {
    this.memCache.clear();
    if (this.redis) {
      try { await this.redis.flushdb(); }
      catch (_) { this.stats_.redis_errors++; }
    }
  }

  // ─── STATS ───────────────────────────────
  async stats() {
    const total = this.stats_.hits + this.stats_.misses;
    return {
      memory_size: this.memCache.size,
      max_memory: this.maxMemorySize,
      hits: this.stats_.hits,
      misses: this.stats_.misses,
      sets: this.stats_.sets,
      hit_rate: total ? ((this.stats_.hits / total) * 100).toFixed(1) + '%' : '0%',
      redis_available: !!this.redis,
      redis_errors: this.stats_.redis_errors,
    };
  }

  // ─── HELPERS ─────────────────────────────
  _safeParse(raw) {
    try { return JSON.parse(raw); } catch (_) { return raw; }
  }

  _enforceMemorySize() {
    while (this.memCache.size > this.maxMemorySize) {
      const firstKey = this.memCache.keys().next().value;
      this.memCache.delete(firstKey);
    }
  }

  cleanupMemory() {
    const now = Date.now();
    for (const [k, v] of this.memCache.entries()) {
      if (v.expires < now) this.memCache.delete(k);
    }
  }

  // ─── WRAP — cache an async function ──────
  async wrap(keyParts, fn, options = {}) {
    const cached = await this.get(keyParts);
    if (cached !== null) return cached;
    const result = await fn();
    await this.set(keyParts, result, options);
    return result;
  }
}

module.exports = { SmartCache };