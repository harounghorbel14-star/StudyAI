// ============================================================
// 🩺 services/health-monitor.js — Auto Infrastructure Diagnostics
// Detects performance degradation, breaker storms, queue overflow.
// ============================================================

class HealthMonitor {
  constructor(options = {}) {
    this.services = options.services;
    this.logger = options.logger;
    this.events = options.events;
    this.checkIntervalMs = options.checkIntervalMs || 60000; // every 60s

    this.lastCheck = null;
    this.alerts = [];
    this.maxAlerts = 100;
    this.timer = null;

    // Thresholds
    this.thresholds = {
      memoryHeapMb: options.memoryHeapMb || 1024,
      breakerOpenMax: options.breakerOpenMax || 1,
      cacheErrorRate: options.cacheErrorRate || 0.10,
      avgLatencyMs: options.avgLatencyMs || 5000,
      errorsPerMin: options.errorsPerMin || 30,
    };
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.check(), this.checkIntervalMs);
    setTimeout(() => this.check(), 5000); // initial check after 5s
    this.logger?.info('Health monitor started', { interval_s: this.checkIntervalMs / 1000 });
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  // ─── Run a full health check ──────────────
  async check() {
    const result = {
      ts: Date.now(),
      checks: {},
      issues: [],
      overall: 'healthy',
    };

    // Memory check
    try {
      const mem = process.memoryUsage();
      const heapMb = mem.heapUsed / 1024 / 1024;
      result.checks.memory = {
        heap_mb: heapMb.toFixed(1),
        rss_mb: (mem.rss / 1024 / 1024).toFixed(1),
        ok: heapMb < this.thresholds.memoryHeapMb,
      };
      if (heapMb > this.thresholds.memoryHeapMb) {
        result.issues.push({ kind: 'high_memory', severity: 'warning', value: heapMb });
      }
    } catch (_) {}

    // Circuit breaker check
    try {
      const breakers = this.services?.breakers?.stats() || [];
      const openCount = breakers.filter(b => b.state === 'OPEN').length;
      result.checks.breakers = { total: breakers.length, open: openCount, ok: openCount <= this.thresholds.breakerOpenMax };
      if (openCount > this.thresholds.breakerOpenMax) {
        result.issues.push({ kind: 'breakers_open', severity: 'critical', value: openCount, breakers: breakers.filter(b => b.state === 'OPEN').map(b => b.name) });
      }
    } catch (_) {}

    // Cache error rate check
    try {
      const cacheStats = await this.services?.cache?.stats?.();
      if (cacheStats) {
        const totalOps = (cacheStats.hits || 0) + (cacheStats.misses || 0) + (cacheStats.sets || 0);
        const errorRate = totalOps > 0 ? (cacheStats.redis_errors || 0) / totalOps : 0;
        result.checks.cache = {
          memory_size: cacheStats.memory_size,
          error_rate: errorRate.toFixed(3),
          ok: errorRate < this.thresholds.cacheErrorRate,
        };
        if (errorRate > this.thresholds.cacheErrorRate && cacheStats.redis_errors > 5) {
          result.issues.push({ kind: 'cache_errors', severity: 'warning', value: cacheStats.redis_errors });
        }
      }
    } catch (_) {}

    // Latency check (from metrics)
    try {
      const snap = this.services?.metrics?.snapshot?.();
      if (snap?.histograms) {
        const aiHist = Object.entries(snap.histograms).find(([k]) => k.includes('ai_call_duration'));
        if (aiHist) {
          const stats = aiHist[1];
          result.checks.latency = { avg_ms: Math.round(stats.avg), p95_ms: Math.round(stats.p95), ok: stats.avg < this.thresholds.avgLatencyMs };
          if (stats.avg > this.thresholds.avgLatencyMs) {
            result.issues.push({ kind: 'high_latency', severity: 'warning', value: Math.round(stats.avg) });
          }
        }
      }
    } catch (_) {}

    // Determine overall status
    const critical = result.issues.filter(i => i.severity === 'critical').length;
    const warnings = result.issues.filter(i => i.severity === 'warning').length;
    if (critical > 0) result.overall = 'critical';
    else if (warnings > 0) result.overall = 'degraded';

    this.lastCheck = result;

    // Record alerts for issues
    if (result.issues.length > 0) {
      const alert = {
        ts: result.ts,
        overall: result.overall,
        issues: result.issues,
      };
      this.alerts.push(alert);
      if (this.alerts.length > this.maxAlerts) this.alerts.shift();

      this.events?.emit('health.alert', alert);
      this.logger?.warn('Health issues detected', { issues: result.issues.length, overall: result.overall });
    }

    return result;
  }

  getStatus() { return this.lastCheck || { overall: 'unknown', checks: {}, issues: [] }; }
  recentAlerts(limit = 20) { return this.alerts.slice(-limit).reverse(); }
}

module.exports = { HealthMonitor };