// ============================================================
// 📊 routes/system.js — Elite Observability & Adaptive
// Tracer · Event bus · Adaptive learning · Stats
// ============================================================
const express = require('express');

module.exports = (db, services, requireAuth, wrap) => {
const router = express.Router();
const { tracer, events, adaptive, metrics, contracts } = services;

// ─── Tracer endpoints ────────────────────────
router.get('/traces', requireAuth, wrap(async (req, res) => {
  const { operation, status, limit } = req.query;
  const traces = tracer.list({
    user_id: req.user.id,
    operation,
    status,
    limit: Math.min(parseInt(limit) || 50, 200),
  });
  res.json({ traces });
}));

router.get('/traces/:id', requireAuth, wrap(async (req, res) => {
  const trace = tracer.get(req.params.id);
  if (!trace) return res.status(404).json({ error: 'Trace not found' });
  // Privacy: only show user's own traces unless public
  if (trace.user_id && trace.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json(trace);
}));

router.get('/traces-stats', requireAuth, wrap(async (req, res) => {
  const since = req.query.since ? parseInt(req.query.since) : null;
  res.json({ stats: tracer.stats({ since, operation: req.query.operation }) });
}));

// ─── Event bus ──────────────────────────────
router.get('/events/recent', requireAuth, wrap(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const recent = events.getRecent({
    name: req.query.name,
    limit,
  });
  res.json({ events: recent });
}));

router.get('/events/stats', requireAuth, wrap(async (req, res) => {
  res.json(events.stats());
}));

// ─── Live event stream (SSE) ─────────────────
router.get('/events/stream', requireAuth, wrap(async (req, res) => {
  const stream = services.sse.createStream(res);
  stream.send('connected', { ts: Date.now() });

  const off = events.on('*', (event) => {
    stream.send('event', event);
  });

  req.on('close', () => { off(); stream.close(); });
}));

// ─── Adaptive intelligence ──────────────────
router.get('/adaptive/best-model', requireAuth, wrap(async (req, res) => {
  const { task } = req.query;
  if (!task) return res.status(400).json({ error: 'Missing task' });
  res.json({ recommendations: adaptive.bestForTask(task) });
}));

router.get('/adaptive/suggest', requireAuth, wrap(async (req, res) => {
  res.json(adaptive.suggestNext(req.user.id));
}));

router.get('/adaptive/user-stats', requireAuth, wrap(async (req, res) => {
  res.json(adaptive.userStats(req.user.id));
}));

router.get('/adaptive/provider-stats', requireAuth, wrap(async (req, res) => {
  res.json({ providers: adaptive.providerStats() });
}));

router.get('/adaptive/patterns', requireAuth, wrap(async (req, res) => {
  res.json({ patterns: adaptive.getUserPatterns(req.user.id, 20) });
}));

// ─── Unified system status ──────────────────
router.get('/status', wrap(async (req, res) => {
  const cacheStats = await services.cache.stats();
  const breakerStats = services.breakers.stats();
  const metricsSnap = metrics.snapshot();

  res.json(contracts.makeHealthResponse(services, {
    cache: cacheStats,
    breakers: breakerStats,
    metrics: {
      counters: Object.entries(metricsSnap.counters).slice(0, 10),
      total_events: events.stats().total_events,
    },
    uptime_s: Math.floor(process.uptime()),
  }));
}));

return router;
};