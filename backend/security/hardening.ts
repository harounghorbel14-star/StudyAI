// ============================================================
// 🔐 security/hardening.ts — CSRF · Per-tier Limits · Headers
// ============================================================
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import type { EventBus, Logger, Plan } from '../types/core';

// ─────────────────────────────────────────────
// 1. CSRF PROTECTION (signed double-submit token)
// ─────────────────────────────────────────────
// Stateless: the token is HMAC-signed with the server secret and
// bound to the session identity, so no server-side store is needed.

export interface CSRFOptions {
  secret?: string;
  cookieName?: string;
  headerName?: string;
  ttlMs?: number;
  exempt?: string[];
}

interface CSRFRequest {
  method: string;
  path: string;
  headers: Record<string, string | string[] | undefined>;
  body?: { _csrf?: string };
  user?: { id?: number | string };
}

interface CSRFResponse {
  status(code: number): { json(body: unknown): unknown };
  json(body: unknown): unknown;
}

type Next = () => void;

export class CSRFProtection {
  private readonly secret: string;
  readonly cookieName: string;
  readonly headerName: string;
  readonly ttlMs: number;
  private readonly exempt: Set<string>;

  constructor(options: CSRFOptions = {}) {
    this.secret = options.secret || process.env.JWT_SECRET || 'change-me';
    this.cookieName = options.cookieName ?? 'nx_csrf';
    this.headerName = options.headerName ?? 'x-csrf-token';
    this.ttlMs = options.ttlMs ?? 12 * 60 * 60 * 1000;
    this.exempt = new Set(options.exempt ?? [
      '/api/payments/webhook',  // Stripe verifies its own signature
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/google',
    ]);
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.secret).update(payload).digest('hex');
  }

  issue(sessionId: string = 'anon'): string {
    const nonce = randomBytes(16).toString('hex');
    const expires = Date.now() + this.ttlMs;
    const payload = `${sessionId}.${nonce}.${expires}`;
    return `${payload}.${this.sign(payload)}`;
  }

  verify(token: unknown, sessionId: string = 'anon'): boolean {
    if (typeof token !== 'string') return false;

    const parts = token.split('.');
    if (parts.length !== 4) return false;
    const [sid, nonce, expires, signature] = parts;

    if (sid !== sessionId) return false;

    const expiresAt = Number(expires);
    if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

    const expected = this.sign(`${sid}.${nonce}.${expires}`);
    // Constant-time comparison so a forged token cannot be
    // discovered by measuring response time.
    try {
      const a = Buffer.from(signature, 'hex');
      const b = Buffer.from(expected, 'hex');
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  middleware() {
    return (req: CSRFRequest, res: CSRFResponse, next: Next): void => {
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
      if (this.exempt.has(req.path)) return next();

      // Bearer-token clients do not send cookies, so they are not
      // exposed to CSRF and do not need a token.
      const authHeader = String(req.headers.authorization ?? '');
      if (authHeader.startsWith('Bearer ')) return next();

      const sessionId = String(req.user?.id ?? 'anon');
      const token = req.headers[this.headerName] ?? req.body?._csrf;

      if (!this.verify(token, sessionId)) {
        res.status(403).json({ error: 'CSRF token invalid or missing' });
        return;
      }
      next();
    };
  }

  tokenRoute() {
    return (req: CSRFRequest, res: CSRFResponse): void => {
      const sessionId = String(req.user?.id ?? 'anon');
      res.json({ csrf_token: this.issue(sessionId), expires_in_ms: this.ttlMs });
    };
  }
}

// ─────────────────────────────────────────────
// 2. PER-TIER RATE LIMITING
// ─────────────────────────────────────────────

export interface TierLimit {
  requests_per_min: number;
  /** -1 means unlimited. */
  ai_calls_per_day: number;
  burst: number;
  concurrent: number;
}

export type LimitTier = Plan | 'admin';

// Burst allows a normal page load (a dashboard fires several parallel
// requests) while still stopping scripted abuse. It stays below the
// per-minute rate so a burst cannot exhaust the whole minute at once.
export const TIER_LIMITS: Record<LimitTier, TierLimit> = {
  free:  { requests_per_min: 20,   ai_calls_per_day: 10,  burst: 10,   concurrent: 3 },
  pro:   { requests_per_min: 120,  ai_calls_per_day: 500, burst: 40,   concurrent: 8 },
  elite: { requests_per_min: 600,  ai_calls_per_day: -1,  burst: 150,  concurrent: 20 },
  team:  { requests_per_min: 1200, ai_calls_per_day: -1,  burst: 300,  concurrent: 40 },
  admin: { requests_per_min: 6000, ai_calls_per_day: -1,  burst: 1000, concurrent: 60 },
};

export type LimitReason = 'rate_limit' | 'burst_limit' | 'daily_quota' | 'concurrency_limit';

export interface RateAllowed {
  allowed: true;
  limit: number;
  remaining: number;
}

export interface RateDenied {
  allowed: false;
  reason: LimitReason;
  limit: number;
  remaining: number;
  retry_after_seconds: number;
}

export type RateResult = RateAllowed | RateDenied;

export interface QuotaAllowed {
  allowed: true;
  unlimited?: boolean;
  limit?: number;
  used?: number;
  remaining?: number;
  resets_at?: number;
}

export interface QuotaDenied {
  allowed: false;
  reason: LimitReason;
  limit: number;
  used: number;
  remaining: number;
  resets_at: number;
}

export type QuotaResult = QuotaAllowed | QuotaDenied;

export interface SlotResult {
  allowed: boolean;
  reason?: LimitReason;
  limit?: number;
  release?: () => void;
}

export interface RateLimiterOptions {
  logger?: Logger | null;
  events?: EventBus | null;
  limits?: Record<LimitTier, TierLimit>;
}

interface DailyEntry {
  count: number;
  resetAt: number;
}

export class TieredRateLimiter {
  private readonly logger: Logger | null;
  private readonly events: EventBus | null;
  private readonly limits: Record<LimitTier, TierLimit>;

  private readonly windows = new Map<string, number[]>();
  private readonly concurrent = new Map<string, number>();
  private readonly dailyCounts = new Map<string, DailyEntry>();
  private cleanupTimer: NodeJS.Timeout | undefined;

  constructor(options: RateLimiterOptions = {}) {
    this.logger = options.logger ?? null;
    this.events = options.events ?? null;
    this.limits = options.limits ?? TIER_LIMITS;

    // Periodic sweep so the maps cannot grow without bound.
    this.cleanupTimer = setInterval(() => this.cleanup(), 60_000);
    this.cleanupTimer.unref?.();
  }

  private cleanup(): void {
    const cutoff = Date.now() - 60_000;
    for (const [key, times] of this.windows) {
      const kept = times.filter((t) => t > cutoff);
      if (kept.length) this.windows.set(key, kept);
      else this.windows.delete(key);
    }
    const now = Date.now();
    for (const [key, entry] of this.dailyCounts) {
      if (entry.resetAt < now) this.dailyCounts.delete(key);
    }
  }

  // Unknown tiers fall back to the most restrictive limits.
  private limitsFor(tier: string): TierLimit {
    return this.limits[tier as LimitTier] ?? this.limits.free;
  }

  // ─── Per-minute + burst ───────────────────
  checkRate({ key, tier }: { key: string; tier: string }): RateResult {
    const limits = this.limitsFor(tier);
    const now = Date.now();
    const windowStart = now - 60_000;

    const times = (this.windows.get(key) ?? []).filter((t) => t > windowStart);

    if (times.length >= limits.requests_per_min) {
      const oldest = times[0] ?? now;
      const retryAfter = Math.ceil((oldest + 60_000 - now) / 1000);
      return {
        allowed: false,
        reason: 'rate_limit',
        limit: limits.requests_per_min,
        remaining: 0,
        retry_after_seconds: Math.max(1, retryAfter),
      };
    }

    const burstWindow = now - 5000;
    const burstCount = times.filter((t) => t > burstWindow).length;
    if (burstCount >= limits.burst) {
      return {
        allowed: false,
        reason: 'burst_limit',
        limit: limits.burst,
        remaining: 0,
        retry_after_seconds: 5,
      };
    }

    times.push(now);
    this.windows.set(key, times);

    return {
      allowed: true,
      limit: limits.requests_per_min,
      remaining: limits.requests_per_min - times.length,
    };
  }

  // ─── Daily AI quota ───────────────────────
  checkDailyQuota({ key, tier }: { key: string; tier: string }): QuotaResult {
    const limits = this.limitsFor(tier);
    if (limits.ai_calls_per_day === -1) return { allowed: true, unlimited: true };

    const now = Date.now();
    let entry = this.dailyCounts.get(key);
    if (!entry || entry.resetAt < now) {
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      entry = { count: 0, resetAt: midnight.getTime() };
    }

    if (entry.count >= limits.ai_calls_per_day) {
      return {
        allowed: false,
        reason: 'daily_quota',
        limit: limits.ai_calls_per_day,
        used: entry.count,
        remaining: 0,
        resets_at: entry.resetAt,
      };
    }

    entry.count++;
    this.dailyCounts.set(key, entry);
    return {
      allowed: true,
      limit: limits.ai_calls_per_day,
      used: entry.count,
      remaining: limits.ai_calls_per_day - entry.count,
      resets_at: entry.resetAt,
    };
  }

  // ─── Concurrency ──────────────────────────
  acquireSlot({ key, tier }: { key: string; tier: string }): SlotResult {
    const limits = this.limitsFor(tier);
    const current = this.concurrent.get(key) ?? 0;
    if (current >= limits.concurrent) {
      return { allowed: false, reason: 'concurrency_limit', limit: limits.concurrent };
    }
    this.concurrent.set(key, current + 1);
    return { allowed: true, release: () => this.releaseSlot(key) };
  }

  releaseSlot(key: string): void {
    const current = this.concurrent.get(key) ?? 0;
    // Clamp at zero: an over-release must not make the counter negative,
    // which would hand out unlimited slots afterwards.
    if (current <= 1) this.concurrent.delete(key);
    else this.concurrent.set(key, current - 1);
  }

  // ─── Middleware ───────────────────────────
  middleware({ scope = 'general' }: { scope?: string } = {}) {
    return (req: any, res: any, next: Next): void => {
      const tier = req.user?.isAdmin ? 'admin' : (req.user?.plan ?? 'free');
      const key = `${scope}:${req.user?.id ?? req.ip}`;
      const result = this.checkRate({ key, tier });

      res.setHeader('X-RateLimit-Limit', result.limit);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, result.remaining));

      if (!result.allowed) {
        res.setHeader('Retry-After', result.retry_after_seconds);
        this.events?.emit('security.rate_limited', {
          user_id: req.user?.id, scope, reason: result.reason,
        });
        res.status(429).json({
          error: 'Rate limit exceeded',
          reason: result.reason,
          retry_after_seconds: result.retry_after_seconds,
          upgrade_hint: tier === 'free' ? 'Upgrade to Pro for higher limits' : undefined,
        });
        return;
      }
      next();
    };
  }

  aiMiddleware() {
    return (req: any, res: any, next: Next): void => {
      const tier = req.user?.isAdmin ? 'admin' : (req.user?.plan ?? 'free');
      const key = `ai:${req.user?.id ?? req.ip}`;

      const rate = this.checkRate({ key, tier });
      if (!rate.allowed) {
        res.setHeader('Retry-After', rate.retry_after_seconds);
        res.status(429).json({
          error: 'Rate limit exceeded',
          reason: rate.reason,
          retry_after_seconds: rate.retry_after_seconds,
        });
        return;
      }

      const quota = this.checkDailyQuota({ key, tier });
      if (!quota.allowed) {
        res.setHeader('X-Quota-Limit', quota.limit);
        res.setHeader('X-Quota-Remaining', 0);
        res.status(429).json({
          error: 'Daily AI quota exceeded',
          limit: quota.limit,
          used: quota.used,
          resets_at: quota.resets_at,
          upgrade_hint:
            tier === 'free' ? 'Upgrade to Pro for 500 calls/day, or Elite for unlimited'
            : tier === 'pro' ? 'Upgrade to Elite for unlimited calls'
            : undefined,
        });
        return;
      }

      if (!quota.unlimited) {
        res.setHeader('X-Quota-Limit', quota.limit);
        res.setHeader('X-Quota-Remaining', quota.remaining);
      }

      const slot = this.acquireSlot({ key, tier });
      if (!slot.allowed) {
        res.status(429).json({ error: 'Too many concurrent requests', limit: slot.limit });
        return;
      }
      // Release on both paths: 'finish' misses aborted connections.
      res.on('finish', () => this.releaseSlot(key));
      res.on('close', () => this.releaseSlot(key));

      next();
    };
  }

  getStatus(userId: number | string, tier: string = 'free') {
    const key = `ai:${userId}`;
    const limits = this.limitsFor(tier);
    const daily = this.dailyCounts.get(key);
    const times = this.windows.get(key) ?? [];
    const recent = times.filter((t) => t > Date.now() - 60_000);
    return {
      tier,
      limits,
      current_minute_requests: recent.length,
      daily_ai_used: daily?.count ?? 0,
      daily_ai_limit: limits.ai_calls_per_day,
      daily_resets_at: daily?.resetAt ?? null,
      concurrent_active: this.concurrent.get(key) ?? 0,
    };
  }

  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }
}

// ─────────────────────────────────────────────
// 3. SECURITY HEADERS
// ─────────────────────────────────────────────
export interface SecurityHeaderOptions {
  csp?: boolean;
}

export function securityHeaders(options: SecurityHeaderOptions = {}) {
  const isProd = process.env.NODE_ENV === 'production';

  return (_req: unknown, res: any, next: Next): void => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Disabled deliberately: the legacy XSS auditor introduced its own
    // vulnerabilities. CSP below is the real defence.
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), payment=(self)');

    if (isProd) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    if (options.csp !== false) {
      res.setHeader('Content-Security-Policy', [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://js.stripe.com",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https: blob:",
        "media-src 'self' data: https: blob:",
        "connect-src 'self' https: wss: ws:",
        'frame-src https://js.stripe.com https://hooks.stripe.com',
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; '));
    }
    next();
  };
}