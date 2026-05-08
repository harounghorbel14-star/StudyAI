// ============================================================
// 🔬 services/tracer.js — Distributed Tracing & Replay
// Captures every step of orchestration for debugging & playback.
// ============================================================
const crypto = require('crypto');

class ExecutionTracer {
  constructor(db, options = {}) {
    this.db = db;
    this.maxTraceAge = options.maxTraceAge || 7 * 24 * 60 * 60 * 1000; // 7 days
    this.activeTraces = new Map(); // trace_id -> { spans, root, started }
    this.initSchema();
    this.startCleanup();
  }

  initSchema() {
    this.db.prepare(`CREATE TABLE IF NOT EXISTS traces (
      trace_id TEXT PRIMARY KEY,
      user_id INTEGER,
      operation TEXT NOT NULL,
      spans TEXT NOT NULL,
      duration_ms INTEGER,
      status TEXT,
      error TEXT,
      metadata TEXT,
      created_at INTEGER NOT NULL
    )`).run();
    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_traces_user ON traces(user_id, created_at)`).run();
    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_traces_op ON traces(operation, created_at)`).run();
  }

  // ─── Start a new trace ────────────────────
  start(operation, metadata = {}) {
    const traceId = `trc_${crypto.randomBytes(8).toString('hex')}`;
    this.activeTraces.set(traceId, {
      operation,
      spans: [],
      metadata,
      started: Date.now(),
      userId: metadata.user_id,
    });
    return traceId;
  }

  // ─── Add a span (sub-operation) ───────────
  span(traceId, name, fn) {
    const trace = this.activeTraces.get(traceId);
    if (!trace) {
      // Untraced execution; just run the fn
      return Promise.resolve(typeof fn === 'function' ? fn() : null);
    }

    const spanId = `spn_${crypto.randomBytes(4).toString('hex')}`;
    const span = { id: spanId, name, started: Date.now(), status: 'running' };
    trace.spans.push(span);

    if (typeof fn !== 'function') {
      // Manual span (will be ended by .endSpan)
      return spanId;
    }

    // Auto-managed span
    return Promise.resolve()
      .then(() => fn())
      .then(result => {
        span.status = 'success';
        span.duration_ms = Date.now() - span.started;
        span.summary = this._summarize(result);
        return result;
      })
      .catch(err => {
        span.status = 'error';
        span.duration_ms = Date.now() - span.started;
        span.error = err.message;
        throw err;
      });
  }

  // ─── Manually log an event in the trace ──
  log(traceId, name, data = {}) {
    const trace = this.activeTraces.get(traceId);
    if (!trace) return;
    trace.spans.push({
      id: `log_${Date.now()}`,
      name,
      type: 'log',
      data: this._summarize(data),
      ts: Date.now(),
    });
  }

  // ─── Finish & persist the trace ───────────
  finish(traceId, status = 'success', error = null) {
    const trace = this.activeTraces.get(traceId);
    if (!trace) return null;

    const duration = Date.now() - trace.started;
    try {
      this.db.prepare(`INSERT OR REPLACE INTO traces (trace_id, user_id, operation, spans, duration_ms, status, error, metadata, created_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(
          traceId,
          trace.userId || null,
          trace.operation,
          JSON.stringify(trace.spans),
          duration,
          status,
          error,
          JSON.stringify(trace.metadata),
          trace.started
        );
    } catch (_) {}

    this.activeTraces.delete(traceId);
    return { trace_id: traceId, duration_ms: duration, span_count: trace.spans.length };
  }

  // ─── Retrieve a trace ─────────────────────
  get(traceId) {
    try {
      const row = this.db.prepare(`SELECT * FROM traces WHERE trace_id = ?`).get(traceId);
      if (!row) return null;
      return {
        ...row,
        spans: JSON.parse(row.spans || '[]'),
        metadata: JSON.parse(row.metadata || '{}'),
      };
    } catch (_) { return null; }
  }

  // ─── List recent traces ───────────────────
  list({ user_id, operation, limit = 50, status } = {}) {
    let sql = `SELECT trace_id, operation, duration_ms, status, created_at FROM traces WHERE 1=1`;
    const params = [];
    if (user_id) { sql += ` AND user_id = ?`; params.push(user_id); }
    if (operation) { sql += ` AND operation = ?`; params.push(operation); }
    if (status) { sql += ` AND status = ?`; params.push(status); }
    sql += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(limit);
    try { return this.db.prepare(sql).all(...params); }
    catch (_) { return []; }
  }

  // ─── Aggregate stats ──────────────────────
  stats({ since, operation } = {}) {
    const sinceTs = since || (Date.now() - 24 * 60 * 60 * 1000);
    try {
      let sql = `SELECT operation, status, COUNT(*) as count, AVG(duration_ms) as avg_duration, MAX(duration_ms) as max_duration FROM traces WHERE created_at >= ?`;
      const params = [sinceTs];
      if (operation) { sql += ` AND operation = ?`; params.push(operation); }
      sql += ` GROUP BY operation, status`;
      return this.db.prepare(sql).all(...params);
    } catch (_) { return []; }
  }

  // ─── Helpers ──────────────────────────────
  _summarize(data) {
    if (data === null || data === undefined) return null;
    if (typeof data === 'string') return data.slice(0, 300);
    try {
      const str = JSON.stringify(data);
      return str.length > 1000 ? str.slice(0, 1000) + '...' : str;
    } catch (_) { return String(data).slice(0, 300); }
  }

  startCleanup() {
    setInterval(() => {
      try {
        const cutoff = Date.now() - this.maxTraceAge;
        this.db.prepare(`DELETE FROM traces WHERE created_at < ?`).run(cutoff);
      } catch (_) {}
    }, 60 * 60 * 1000); // every hour
  }
}

module.exports = { ExecutionTracer };