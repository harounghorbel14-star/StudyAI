// ============================================================
// 🧠 routes/intelligence.js — Compound Intelligence API
// Multi-model · Validation · Refinement · Reasoning chains
// ============================================================
const express = require('express');

module.exports = (db, services, requireAuth, requireQuota, aiLimiter, wrap) => {
const router = express.Router();
const { compound, smartCall, runAgent, agents, sse, security, logger, metrics, memory } = services;

// ─── Multi-model reasoning ───────────────────
router.post('/multi-model', requireAuth, requireQuota, aiLimiter, wrap(async (req, res) => {
  const { prompt, system, perspectives, synthesize } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  const sanitized = security.sanitizeInput(prompt, { maxLength: 10000 });
  const result = await compound.multiModel({
    prompt: sanitized,
    system,
    perspectives,
    synthesize: synthesize !== false,
  });

  metrics.increment('intelligence_multi_model');
  res.json(result);
}));

// ─── Validate output ─────────────────────────
router.post('/validate', requireAuth, aiLimiter, wrap(async (req, res) => {
  const { output, criteria, original_prompt } = req.body;
  if (output === undefined) return res.status(400).json({ error: 'Missing output' });

  const result = await compound.validate({ output, criteria: criteria || [], original_prompt });
  metrics.increment('intelligence_validate');
  res.json(result);
}));

// ─── Refine weak output ──────────────────────
router.post('/refine', requireAuth, requireQuota, aiLimiter, wrap(async (req, res) => {
  const { original_prompt, output, validation, max_iterations } = req.body;
  if (!original_prompt || output === undefined) {
    return res.status(400).json({ error: 'Missing original_prompt or output' });
  }

  const result = await compound.refine({
    original_prompt,
    output,
    validation,
    max_iterations: max_iterations || 2,
  });
  metrics.increment('intelligence_refine');
  res.json(result);
}));

// ─── Execute with confidence (auto-validate + refine) ────
router.post('/execute', requireAuth, requireQuota, aiLimiter, wrap(async (req, res) => {
  const { prompt, system, criteria, task, json, min_score, max_refinements } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  const sanitized = security.sanitizeInput(prompt, { maxLength: 10000 });
  const result = await compound.executeWithConfidence({
    prompt: sanitized,
    system,
    criteria: criteria || [],
    task,
    json: json || false,
    min_score: min_score || 75,
    max_refinements: max_refinements || 2,
  });

  metrics.increment('intelligence_execute');
  res.json(result);
}));

// ─── Reasoning chain (decompose + execute + synthesize) ──
router.post('/reasoning-chain', requireAuth, requireQuota, aiLimiter, wrap(async (req, res) => {
  const { goal, max_steps } = req.body;
  if (!goal) return res.status(400).json({ error: 'Missing goal' });

  const stream = sse.createStream(res);

  try {
    stream.send('start', { goal });
    const result = await compound.reasoningChain({ goal, max_steps: max_steps || 6 });
    stream.send('plan', { plan: result.plan });
    stream.send('steps_executed', { count: result.steps_executed });
    stream.done({ final_answer: result.final_answer, plan: result.plan, step_results: result.step_results });
  } catch (e) {
    logger.error('Reasoning chain failed', { error: e.message });
    stream.error(e.message);
    stream.close();
  }
}));

// ─── Contradiction check ─────────────────────
router.post('/contradictions', requireAuth, aiLimiter, wrap(async (req, res) => {
  const { claims } = req.body;
  if (!Array.isArray(claims) || claims.length < 2) {
    return res.status(400).json({ error: 'Need at least 2 claims to check' });
  }
  const result = await compound.checkContradictions(claims);
  res.json(result);
}));

// ─── Run a specific agent by key ─────────────
router.post('/agent/:key', requireAuth, requireQuota, aiLimiter, wrap(async (req, res) => {
  const { key } = req.params;
  const { prompt, context } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });
  if (!agents.AGENTS[key]) return res.status(404).json({ error: `Unknown agent: ${key}` });

  const result = await runAgent(key, prompt, context);
  metrics.increment('agent_runs', 1, { agent: key });
  res.json(result);
}));

// ─── List all agents ─────────────────────────
router.get('/agents', wrap(async (req, res) => {
  const list = Object.entries(agents.AGENTS).map(([key, agent]) => ({
    key,
    name: agent.name,
    emoji: agent.emoji,
    role: agent.role,
    can_delegate_to: agent.can_delegate_to || [],
  }));
  res.json({ agents: list });
}));

// ─── Auto-pick agent for a task ──────────────
router.post('/agent-pick', requireAuth, wrap(async (req, res) => {
  const { task_description } = req.body;
  if (!task_description) return res.status(400).json({ error: 'Missing task_description' });
  const key = agents.pickAgent(task_description);
  res.json({ agent: key, details: agents.AGENTS[key] });
}));

// ─── Memory operations ───────────────────────
router.post('/memory/remember', requireAuth, wrap(async (req, res) => {
  const { category, key, value, importance } = req.body;
  if (!category || !key || value === undefined) return res.status(400).json({ error: 'Missing fields' });
  memory.remember(req.user.id, category, key, value, importance);
  res.json({ ok: true });
}));

router.get('/memory/list/:category', requireAuth, wrap(async (req, res) => {
  res.json({ memories: memory.list(req.user.id, req.params.category, 50) });
}));

router.get('/memory/context', requireAuth, wrap(async (req, res) => {
  res.json({ context: memory.buildContext(req.user.id) });
}));

router.get('/memory/stats', requireAuth, wrap(async (req, res) => {
  res.json(memory.stats(req.user.id));
}));

// ─── Memory graph ────────────────────────────
router.post('/memory/graph/node', requireAuth, wrap(async (req, res) => {
  const { node_type, node_key, content, metadata } = req.body;
  if (!node_type || !node_key || !content) return res.status(400).json({ error: 'Missing fields' });
  const id = memory.addNode(req.user.id, node_type, node_key, content, metadata || {});
  res.json({ ok: true, id });
}));

router.post('/memory/graph/edge', requireAuth, wrap(async (req, res) => {
  const { from_node, to_node, relation, weight } = req.body;
  if (!from_node || !to_node || !relation) return res.status(400).json({ error: 'Missing fields' });
  memory.addEdge(req.user.id, from_node, to_node, relation, weight || 1.0);
  res.json({ ok: true });
}));

router.get('/memory/graph/related/:nodeId', requireAuth, wrap(async (req, res) => {
  const depth = Math.min(parseInt(req.query.depth) || 1, 3);
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const related = memory.getRelated(req.user.id, parseInt(req.params.nodeId), depth, limit);
  res.json({ related });
}));

router.get('/memory/search', requireAuth, wrap(async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing q' });
  res.json({ results: memory.searchNodes(req.user.id, q, 20) });
}));

// ─── Metrics & observability ─────────────────
router.get('/metrics', requireAuth, wrap(async (req, res) => {
  res.json(metrics.snapshot());
}));

router.get('/breakers', requireAuth, wrap(async (req, res) => {
  res.json({ breakers: services.breakers.stats() });
}));

return router;
};