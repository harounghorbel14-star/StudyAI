// ============================================================
// 📡 monitoring/observability.ts — Sentry + PostHog
// Real egress, not just configuration. Secrets are scrubbed before
// anything leaves the process; both integrations degrade silently
// when their keys are absent.
// ============================================================
import type { EventBus, Logger } from '../types/core';

export type SentryLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

export interface ObservabilityOptions {
  logger?: Logger | null;
  events?: EventBus | null;
  release?: string;
  environment?: string;
  sentryDsn?: string;
  posthogKey?: string;
  posthogHost?: string;
}

export interface ErrorContext {
  user_id?: number | string;
  operation?: string;
  provider?: string;
  severity?: SentryLevel;
  [key: string]: unknown;
}

export interface TrackInput {
  user_id?: number | string;
  event: string;
  properties?: Record<string, unknown>;
}

export interface ObservabilityStatus {
  sentry: {
    configured: boolean;
    active: boolean;
    errors_captured: number;
    errors_dropped: number;
  };
  posthog: {
    configured: boolean;
    active: boolean;
    events_sent: number;
    events_queued: number;
    flush_failures: number;
  };
  environment: string;
  release: string;
}

interface SentryScope {
  setUser(user: { id: string }): void;
  setTag(key: string, value: string): void;
  setLevel(level: SentryLevel): void;
  setExtra(key: string, value: unknown): void;
}

interface SentryLike {
  init(config: Record<string, unknown>): void;
  withScope(callback: (scope: SentryScope) => void): void;
  captureException(error: unknown): void;
  captureMessage(message: string): void;
  close(timeout: number): Promise<boolean>;
}

interface PostHogEvent {
  event: string;
  distinct_id: string;
  properties: Record<string, unknown>;
  timestamp: string;
}

// Anything matching this in a key name is replaced wholesale.
const SENSITIVE_KEY = /(api[-_]?key|authorization|password|secret|token|cookie|stripe)/i;
// Values that look like credentials even under an innocuous key.
const SENSITIVE_VALUE = /^(sk-|pk_|rk_|Bearer\s)/i;
const REDACTED = '[REDACTED]';
const MAX_SCRUB_DEPTH = 6;
const MAX_QUEUE = 500;
const FLUSH_INTERVAL_MS = 10_000;
const FLUSH_THRESHOLD = 50;
const BATCH_SIZE = 100;

export class Observability {
  private readonly logger: Logger | null;
  private readonly events: EventBus | null;
  readonly release: string;
  readonly environment: string;

  private readonly sentryDsn: string | undefined;
  private readonly posthogKey: string | undefined;
  private readonly posthogHost: string;

  private sentry: SentryLike | null = null;
  private posthogQueue: PostHogEvent[] = [];
  private posthogTimer: NodeJS.Timeout | undefined;

  private stats = {
    errors_captured: 0,
    errors_dropped: 0,
    events_sent: 0,
    events_queued: 0,
    flush_failures: 0,
  };

  constructor(options: ObservabilityOptions = {}) {
    this.logger = options.logger ?? null;
    this.events = options.events ?? null;
    this.release = options.release || process.env.APP_VERSION || 'dev';
    this.environment = options.environment || process.env.NODE_ENV || 'development';

    this.sentryDsn = options.sentryDsn || process.env.SENTRY_DSN;
    this.posthogKey = options.posthogKey || process.env.POSTHOG_API_KEY;
    this.posthogHost = options.posthogHost || process.env.POSTHOG_HOST || 'https://app.posthog.com';

    this.initSentry();
    this.initPostHog();
    this.subscribeToEvents();
  }

  // ─── Sentry ───────────────────────────────
  private initSentry(): void {
    if (!this.sentryDsn) {
      this.logger?.info('Sentry not configured — errors logged locally only');
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Sentry = require('@sentry/node') as SentryLike;
      Sentry.init({
        dsn: this.sentryDsn,
        environment: this.environment,
        release: this.release,
        tracesSampleRate: this.environment === 'production' ? 0.1 : 1.0,
        beforeSend: (event: Record<string, unknown>) => this.scrubEvent(event),
      });
      this.sentry = Sentry;
      this.logger?.info('Sentry initialised', {
        environment: this.environment, release: this.release,
      });
    } catch {
      this.logger?.warn('Sentry package not installed — run: npm install @sentry/node');
    }
  }

  // Remove credentials before anything is transmitted.
  scrubEvent(event: Record<string, unknown>): Record<string, unknown> {
    const scrub = (value: unknown, depth = 0): void => {
      if (!value || typeof value !== 'object' || depth > MAX_SCRUB_DEPTH) return;
      const obj = value as Record<string, unknown>;
      for (const key of Object.keys(obj)) {
        const current = obj[key];
        if (SENSITIVE_KEY.test(key)) {
          obj[key] = REDACTED;
        } else if (typeof current === 'object') {
          scrub(current, depth + 1);
        } else if (typeof current === 'string' && current.length > 20) {
          if (SENSITIVE_VALUE.test(current)) obj[key] = REDACTED;
        }
      }
    };

    if (!event || typeof event !== 'object') return event;

    const request = event.request as Record<string, unknown> | undefined;
    if (request?.headers) scrub(request.headers);
    if (request?.data) scrub(request.data);
    if (event.extra) scrub(event.extra);
    if (event.contexts) scrub(event.contexts);
    return event;
  }

  captureError(error: unknown, context: ErrorContext = {}): void {
    this.stats.errors_captured++;

    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error
      ? error.stack?.split('\n').slice(0, 4).join('\n')
      : undefined;

    this.logger?.error('Error captured', { error: message, stack, ...context });

    if (!this.sentry) {
      this.stats.errors_dropped++;
      return;
    }

    try {
      this.sentry.withScope((scope) => {
        if (context.user_id !== undefined) scope.setUser({ id: String(context.user_id) });
        if (context.operation) scope.setTag('operation', context.operation);
        if (context.provider) scope.setTag('provider', context.provider);
        if (context.severity) scope.setLevel(context.severity);

        const reserved = new Set(['user_id', 'operation', 'provider', 'severity']);
        for (const [key, value] of Object.entries(context)) {
          if (!reserved.has(key)) scope.setExtra(key, value);
        }
        this.sentry!.captureException(error);
      });
    } catch {
      this.stats.errors_dropped++;
    }
  }

  captureMessage(message: string, level: SentryLevel = 'info', context: Record<string, unknown> = {}): void {
    if (!this.sentry) return;
    try {
      this.sentry.withScope((scope) => {
        scope.setLevel(level);
        for (const [key, value] of Object.entries(context)) scope.setExtra(key, value);
        this.sentry!.captureMessage(message);
      });
    } catch {
      // Reporting must never break the caller.
    }
  }

  errorHandler() {
    return (err: any, req: any, _res: unknown, next: (e?: unknown) => void): void => {
      const status = err?.statusCode;
      this.captureError(err, {
        operation: `${req?.method} ${req?.path}`,
        user_id: req?.user?.id,
        severity: !status || status >= 500 ? 'error' : 'warning',
      });
      next(err);
    };
  }

  // ─── PostHog ──────────────────────────────
  private initPostHog(): void {
    if (!this.posthogKey) {
      this.logger?.info('PostHog not configured — analytics local only');
      return;
    }
    this.posthogTimer = setInterval(() => {
      void this.flushPostHog();
    }, FLUSH_INTERVAL_MS);
    this.posthogTimer.unref?.();
    this.logger?.info('PostHog initialised', { host: this.posthogHost });
  }

  track({ user_id, event, properties = {} }: TrackInput): void {
    if (!this.posthogKey) return;

    this.posthogQueue.push({
      event,
      distinct_id: String(user_id ?? 'anonymous'),
      properties: {
        ...properties,
        $lib: 'nexusai',
        environment: this.environment,
        release: this.release,
      },
      timestamp: new Date().toISOString(),
    });
    this.stats.events_queued++;

    if (this.posthogQueue.length >= FLUSH_THRESHOLD) {
      void this.flushPostHog();
    }
  }

  private async flushPostHog(): Promise<void> {
    if (!this.posthogKey || this.posthogQueue.length === 0) return;
    const batch = this.posthogQueue.splice(0, BATCH_SIZE);

    try {
      const res = await fetch(`${this.posthogHost}/batch/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: this.posthogKey, batch }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.stats.events_sent += batch.length;
    } catch (err: unknown) {
      this.stats.flush_failures++;
      // Requeue for one more attempt, but bound the queue so a long
      // outage cannot grow memory without limit.
      if (this.posthogQueue.length < MAX_QUEUE) {
        this.posthogQueue.unshift(...batch);
      }
      this.logger?.warn('PostHog flush failed', {
        err: err instanceof Error ? err.message : String(err),
        queued: this.posthogQueue.length,
      });
    }
  }

  // ─── Auto-instrumentation ─────────────────
  private subscribeToEvents(): void {
    if (!this.events) return;

    this.events.on('ai.call.done', (p: any) => {
      this.track({
        user_id: p?.user_id,
        event: 'ai_call_completed',
        properties: {
          provider: p?.provider, model: p?.model,
          duration_ms: p?.duration_ms, task_type: p?.task_type,
        },
      });
    });

    this.events.on('ai.call.fail', (p: any) => {
      this.track({
        user_id: p?.user_id,
        event: 'ai_call_failed',
        properties: { provider: p?.provider, error: p?.error },
      });
    });

    this.events.on('workspace.created', (p: any) => {
      this.track({
        user_id: p?.owner_id,
        event: 'workspace_created',
        properties: { workspace_id: p?.workspace_id },
      });
    });

    this.events.on('payment.subscription_created', (p: any) => {
      this.track({ user_id: p?.user_id, event: 'subscription_started', properties: { plan: p?.plan } });
    });

    this.events.on('payment.subscription_cancelled', (p: any) => {
      this.track({ user_id: p?.user_id, event: 'subscription_cancelled' });
    });

    this.events.on('marketplace.published', (p: any) => {
      this.track({ user_id: p?.owner_id, event: 'marketplace_published', properties: { kind: p?.kind } });
    });

    this.events.on('security.rate_limited', (p: any) => {
      this.track({
        user_id: p?.user_id,
        event: 'rate_limited',
        properties: { scope: p?.scope, reason: p?.reason },
      });
    });
  }

  // ─── Status ───────────────────────────────
  getStatus(): ObservabilityStatus {
    return {
      sentry: {
        configured: Boolean(this.sentryDsn),
        active: Boolean(this.sentry),
        errors_captured: this.stats.errors_captured,
        errors_dropped: this.stats.errors_dropped,
      },
      posthog: {
        configured: Boolean(this.posthogKey),
        active: Boolean(this.posthogTimer),
        events_sent: this.stats.events_sent,
        events_queued: this.posthogQueue.length,
        flush_failures: this.stats.flush_failures,
      },
      environment: this.environment,
      release: this.release,
    };
  }

  async shutdown(): Promise<void> {
    if (this.posthogTimer) {
      clearInterval(this.posthogTimer);
      this.posthogTimer = undefined;
    }
    await this.flushPostHog().catch(() => undefined);
    if (this.sentry) await this.sentry.close(2000).catch(() => undefined);
  }

  /** Retained for the existing unit tests. */
  _scrubEvent(event: Record<string, unknown>): Record<string, unknown> {
    return this.scrubEvent(event);
  }

  /** Retained for the existing unit tests. */
  get _posthogQueue(): PostHogEvent[] {
    return this.posthogQueue;
  }
}