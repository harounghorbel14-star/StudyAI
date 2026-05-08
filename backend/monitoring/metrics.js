// ============================================================
// 📊 monitoring/metrics.js — Observability & Metrics
// In-memory counters, percentiles, optional Sentry/PostHog hooks
// ============================================================

class MetricsService {
  constructor(options = {}) {
    this.logger = options.logger;
    this.counters = new Map();
    this.gauges = new Map();
    this.histograms = new Map();
    this.events = [];
    this.maxEvents = options.maxEvents || 1000;

    // Optional integrations (loaded lazily)
    this.sentry = null;
    this.posthog = null;
    this._initIntegrations();
  }

  async _initIntegrations() {
    if (process.env.SENTRY_DSN) {
      try {
        const Sentry = require('@sentry/node');
        Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
        this.sentry = Sentry;
        this.logger?.info('Sentry initialized');
      } catch (_) { /* sentry optional */ }
    }
    if (process.env.POSTHOG_API_KEY) {
      try {
        const { PostHog } = require('posthog-node');
        this.posthog = new PostHog(process.env.POSTHOG_API_KEY, {
          host: process.env.POSTHOG_HOST || 'https://us.posthog.com',
        });
        this.logger?.info('PostHog initialized');
      } catch (_) { /* posthog optional */ }
    }
  }

  // ─── COUNTERS ────────────────────────────
  increment(name, value = 1, tags = {}) {
    const key = this._key(name, tags);
    this.counters.set(key, (this.counters.get(key) || 0) + value);
  }

  // ─── GAUGES ──────────────────────────────
  gauge(name, value, tags = {}) {
    const key = this._key(name, tags);
    this.gauges.set(key, { value, ts: Date.now() });
  }

  // ─── HISTOGRAMS (latency tracking) ────────
  observe(name, value, tags = {}) {
    const key = this._key(name, tags);
    if (!this.histograms.has(key)) {
      this.histograms.set(key, []);
    }
    const arr = this.histograms.get(key);
    arr.push(value);
    if (arr.length > 1000) arr.shift();
  }

  // ─── TIMING UTILITY ──────────────────────
  startTimer(name, tags = {}) {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.observe(name, duration, tags);
      return duration;
    };
  }

  // ─── EVENTS (for analytics) ──────────────
  track(eventName, properties = {}, userId = null) {
    const event = { event: eventName, properties, user_id: userId, ts: Date.now() };
    this.events.push(event);
    if (this.events.length > this.maxEvents) this.events.shift();

    if (this.posthog && userId) {
      try { this.posthog.capture({ distinctId: String(userId), event: eventName, properties }); }
      catch (_) {}
    }
  }

  // ─── ERROR REPORTING ─────────────────────
  captureError(error, context = {}) {
    this.increment('errors_total');
    this.logger?.error('Error captured', { error: error.message, stack: error.stack?.slice(0, 500), ...context });
    if (this.sentry) {
      try { this.sentry.captureException(error, { extra: context }); }
      catch (_) {}
    }
  }

  // ─── EXPORT METRICS ──────────────────────
  snapshot() {
    const counters = Object.fromEntries(this.counters);
    const gauges = Object.fromEntries(
      [...this.gauges.entries()].map(([k, v]) => [k, v.value])
    );

    const histograms = {};
    for (const [key, values] of this.histograms.entries()) {
      if (values.length === 0) continue;
      const sorted = [...values].sort((a, b) => a - b);
      histograms[key] = {
        count: sorted.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        avg: sorted.reduce((s, v) => s + v, 0) / sorted.length,
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)],
      };
    }

    return { counters, gauges, histograms, events_buffered: this.events.length, ts: Date.now() };
  }

  // ─── HEALTH CHECK ────────────────────────
  health() {
    const memUsage = process.memoryUsage();
    return {
      status: 'healthy',
      uptime_seconds: Math.floor(process.uptime()),
      memory: {
        rss_mb: (memUsage.rss / 1024 / 1024).toFixed(1),
        heap_used_mb: (memUsage.heapUsed / 1024 / 1024).toFixed(1),
        heap_total_mb: (memUsage.heapTotal / 1024 / 1024).toFixed(1),
        external_mb: (memUsage.external / 1024 / 1024).toFixed(1),
      },
      cpu: process.cpuUsage(),
      timestamp: new Date().toISOString(),
    };
  }

  _key(name, tags) {
    if (!tags || !Object.keys(tags).length) return name;
    const tagStr = Object.entries(tags).map(([k, v]) => `${k}=${v}`).join(',');
    return `${name}{${tagStr}}`;
  }
}

module.exports = { MetricsService };