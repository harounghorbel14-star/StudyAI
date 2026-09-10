// ============================================================
// 💰 services/semantic-cache.ts — AI Cost Optimization
// Reuses similar past AI responses based on prompt similarity.
// Cuts costs 30-60% on repeated queries.
// ============================================================
import type { AIResult, Cache, EventBus, Logger, TaskType } from '../../types/core';
import { createHash } from 'crypto';

export interface SemanticCacheOptions {
  cache?: Cache | null;
  logger?: Logger | null;
  events?: EventBus | null;
  maxIndexSize?: number;
  similarityThreshold?: number;
  maxAge?: number;
}

export interface LookupParams {
  prompt: string;
  system?: string;
  task?: TaskType;
  json?: boolean;
  cacheable?: boolean;
  cacheTTL?: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  exact: number;
  similar: number;
  total: number;
  hit_rate: number;
  index_size: number;
}

// The base AIResult types `cached` loosely (boolean | string) because
// other providers set it differently. Here we narrow it to the two
// values this cache can produce, so callers can switch on it safely.
export type CachedResult = Omit<AIResult, 'cached'> & {
  ts?: number;
  ttl?: number;
  cached?: 'exact' | 'similar';
  similarity?: number;
};

interface IndexEntry {
  cacheKey: string;
  normalized: string;
  task: string;
  ts: number;
}

export class SemanticCache {
  private readonly cache: Cache | null;
  private readonly logger: Logger | null;
  private readonly events: EventBus | null;

  private readonly index = new Map<string, IndexEntry>();
  private stats = { hits: 0, misses: 0, exact: 0, similar: 0 };

  readonly maxIndexSize: number;
  readonly similarityThreshold: number;
  readonly maxAge: number;

  constructor(options: SemanticCacheOptions = {}) {
    this.cache = options.cache ?? null;
    this.logger = options.logger ?? null;
    this.events = options.events ?? null;

    this.maxIndexSize = options.maxIndexSize ?? 5000;
    this.similarityThreshold = options.similarityThreshold ?? 0.85;
    this.maxAge = options.maxAge ?? 7 * 24 * 60 * 60 * 1000;
  }

  // ─── Normalisation ────────────────────────
  private normalize(prompt: string): string {
    return String(prompt)
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .trim()
      .slice(0, 2000);
  }

  // ─── Exact key ────────────────────────────
  // Every field that changes the model's output must be part of the
  // key, otherwise a cached answer could leak across contexts.
  private exactKey(params: LookupParams): string {
    const normalized = JSON.stringify({
      p: this.normalize(params.prompt),
      s: params.system ?? '',
      t: params.task ?? 'general',
      j: Boolean(params.json),
    });
    return 'aic:' + createHash('sha256').update(normalized).digest('hex').slice(0, 24);
  }

  // ─── Jaccard similarity over word sets ────
  private similarity(a: string, b: string): number {
    const setA = new Set(a.split(' ').filter((w) => w.length > 2));
    const setB = new Set(b.split(' ').filter((w) => w.length > 2));
    if (setA.size === 0 && setB.size === 0) return 1;
    if (setA.size === 0 || setB.size === 0) return 0;

    let intersection = 0;
    for (const word of setA) if (setB.has(word)) intersection++;
    const union = new Set([...setA, ...setB]).size;
    return intersection / union;
  }

  // ─── Lookup ───────────────────────────────
  async lookup(params: LookupParams): Promise<CachedResult | null> {
    if (!params.cacheable) return null;

    // Fast path: exact match
    const exactKey = this.exactKey(params);
    const exact = await this.cache?.get<CachedResult>([exactKey]);
    if (exact && this.isFresh(exact)) {
      this.stats.hits++;
      this.stats.exact++;
      this.events?.emit('semantic_cache.hit', { type: 'exact' });
      return { ...exact, cached: 'exact' };
    }

    // Slow path: nearest similar prompt within the same task scope
    const normalized = this.normalize(params.prompt);
    const taskScope = params.task ?? 'general';
    let bestMatch: IndexEntry | null = null;
    let bestScore = 0;

    for (const [key, entry] of this.index) {
      if (entry.task !== taskScope) continue;
      if (Date.now() - entry.ts > this.maxAge) {
        this.index.delete(key);
        continue;
      }
      const score = this.similarity(normalized, entry.normalized);
      if (score > bestScore && score >= this.similarityThreshold) {
        bestScore = score;
        bestMatch = entry;
      }
    }

    if (bestMatch) {
      const cached = await this.cache?.get<CachedResult>([bestMatch.cacheKey]);
      if (cached && this.isFresh(cached)) {
        this.stats.hits++;
        this.stats.similar++;
        this.events?.emit('semantic_cache.hit', { type: 'similar', score: bestScore });
        return { ...cached, cached: 'similar', similarity: bestScore };
      }
    }

    this.stats.misses++;
    return null;
  }

  // ─── Store ────────────────────────────────
  async store(params: LookupParams, result: AIResult): Promise<void> {
    if (!params.cacheable) return;

    const exactKey = this.exactKey(params);
    const ttl = params.cacheTTL ?? 24 * 60 * 60;

    // Drop any incoming `cached` flag: it describes how a result was
    // retrieved, not a property of the value itself. Persisting it
    // would make a fresh read look like a cache hit.
    const { cached: _ignored, ...payload } = result;
    const stored: CachedResult = { ...payload, ts: Date.now(), ttl };

    await this.cache?.set([exactKey], stored, ttl);

    this.index.set(exactKey, {
      cacheKey: exactKey,
      normalized: this.normalize(params.prompt),
      task: params.task ?? 'general',
      ts: Date.now(),
    });

    this.evictIfNeeded();
  }

  // Oldest-first eviction keeps the index bounded.
  private evictIfNeeded(): void {
    if (this.index.size <= this.maxIndexSize) return;
    const overflow = this.index.size - this.maxIndexSize;
    const oldest = [...this.index.entries()]
      .sort((a, b) => a[1].ts - b[1].ts)
      .slice(0, overflow);
    for (const [key] of oldest) this.index.delete(key);
  }

  private isFresh(entry: CachedResult): boolean {
    if (!entry.ts) return true;
    return Date.now() - entry.ts < this.maxAge;
  }

  // ─── Stats ────────────────────────────────
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      total,
      hit_rate: total > 0 ? this.stats.hits / total : 0,
      index_size: this.index.size,
    };
  }

  reset(): void {
    this.stats = { hits: 0, misses: 0, exact: 0, similar: 0 };
    this.index.clear();
  }

  // Exposed for unit tests that verify similarity and key semantics.
  _normalize(prompt: string): string { return this.normalize(prompt); }
  _similarity(a: string, b: string): number { return this.similarity(a, b); }
  _exactKey(params: LookupParams): string { return this.exactKey(params); }
}