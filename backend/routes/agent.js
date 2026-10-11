// ============================================================
// 🤖 routes/agent.js — Agent runs, events, approvals, lessons
//
// Every read and write is scoped to req.user.id. Another user's run or
// lesson is answered with 404, exactly like one that does not exist.
// ============================================================
const express = require('express');

module.exports = ({ runner, memory, requireAuth, requireQuota, aiLimiter, wrap }) => {
  const router = express.Router();

  const toError = (res, err) => {
    const map = { INVALID_GOAL: 400, TOO_MANY_RUNS: 429, NOT_AWAITING: 409 };
    if (map[err.code]) return res.status(map[err.code]).json({ error: err.message, code: err.code });
    throw err;
  };

  // Start a run. One quota unit per run; the run's own budget caps the
  // model and tool calls it can make.
  router.post('/runs', requireAuth, requireQuota, aiLimiter, wrap(async (req, res) => {
    try {
      const run = runner.create(req.user, req.body?.goal, req.body?.budget);
      runner.start(req.user, run.id);   // background; progress via /events
      res.status(202).json({ run });
    } catch (err) { toError(res, err); }
  }));

  router.get('/runs', requireAuth, wrap(async (req, res) => {
    res.json({ runs: runner.list(req.user.id) });
  }));

  router.get('/runs/:id', requireAuth, wrap(async (req, res) => {
    const run = runner.get(req.user.id, req.params.id);
    if (!run) return res.status(404).json({ error: 'Run not found.' });
    res.json({ run });
  }));

  // Polling: ?after=<last event id>. Streaming: Accept: text/event-stream.
  router.get('/runs/:id/events', requireAuth, wrap(async (req, res) => {
    const after = Number(req.query.after) || 0;
    const first = runner.events(req.user.id, req.params.id, after);
    if (!first) return res.status(404).json({ error: 'Run not found.' });
    if (!String(req.headers.accept || '').includes('text/event-stream')) {
      const run = runner.get(req.user.id, req.params.id);
      return res.json({ events: first, status: run.status });
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    let last = after;
    let closed = false;
    req.on('close', () => { closed = true; });
    const started = Date.now();
    const send = (events) => {
      for (const e of events) { res.write(`id: ${e.id}\nevent: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`); last = e.id; }
    };
    send(first);
    while (!closed && Date.now() - started < 10 * 60_000) {
      await new Promise((r) => setTimeout(r, 400));
      const evs = runner.events(req.user.id, req.params.id, last) || [];
      send(evs);
      const run = runner.get(req.user.id, req.params.id);
      if (!run || ['succeeded', 'failed', 'cancelled', 'stopped', 'needs_input', 'awaiting_approval'].includes(run.status)) {
        send(runner.events(req.user.id, req.params.id, last) || []);
        res.write(`event: end\ndata: ${JSON.stringify({ status: run?.status })}\n\n`);
        break;
      }
    }
    res.end();
  }));

  router.post('/runs/:id/cancel', requireAuth, wrap(async (req, res) => {
    const r = runner.cancel(req.user.id, req.params.id);
    if (!r) return res.status(404).json({ error: 'Run not found.' });
    res.json(r);
  }));

  // Approve or reject the external action a run is paused on.
  router.post('/runs/:id/decision', requireAuth, wrap(async (req, res) => {
    const decision = req.body?.decision;
    if (!['approve', 'reject'].includes(decision)) return res.status(400).json({ error: 'decision must be "approve" or "reject".' });
    try {
      const p = runner.decide(req.user, req.params.id, decision);
      if (p === null) return res.status(404).json({ error: 'Run not found.' });
      res.json({ ok: true, decision });
    } catch (err) { toError(res, err); }
  }));

  router.delete('/runs/:id', requireAuth, wrap(async (req, res) => {
    if (!runner.remove(req.user.id, req.params.id)) return res.status(404).json({ error: 'Run not found or still active.' });
    res.json({ ok: true });
  }));

  // ── Lessons (reviewed memory) ──
  router.get('/lessons', requireAuth, wrap(async (req, res) => {
    const status = ['proposed', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : undefined;
    res.json({ lessons: memory.list(req.user.id, status) });
  }));

  router.post('/lessons', requireAuth, wrap(async (req, res) => {
    const r = memory.addByUser(req.user.id, req.body?.text, req.body?.applies_when);
    if (r.error) return res.status(400).json(r);
    res.status(201).json(r);
  }));

  router.patch('/lessons/:id', requireAuth, wrap(async (req, res) => {
    const lesson = memory.review(req.user.id, Number(req.params.id), req.body?.status);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found (status must be approved or rejected).' });
    res.json({ lesson });
  }));

  router.delete('/lessons/:id', requireAuth, wrap(async (req, res) => {
    if (!memory.remove(req.user.id, Number(req.params.id))) return res.status(404).json({ error: 'Lesson not found.' });
    res.json({ ok: true });
  }));

  return router;
};
