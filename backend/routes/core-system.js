// ============================================================
// 🧠 routes/core-system.js — Production Core Routes
// Uses: services (router, cache, orchestrator, sse, security)
// ============================================================
const express = require('express');
const crypto = require('crypto');

module.exports = (db, openai, services, requireAuth, requireQuota, aiLimiter, wrap) => {
const router = express.Router();
const { router: modelRouter, cache, memory, logger, sse, security, smartCall, createOrchestrator, queues } = services;

// ─── Models registry ────────────────────────
router.get('/models', wrap(async (req, res) => {
  res.json({
    providers: modelRouter.PROVIDERS,
    registry: modelRouter.MODEL_REGISTRY,
    patterns: modelRouter.TASK_PATTERNS,
  });
}));

// ─── Smart routed AI call ───────────────────
router.post('/route', requireAuth, requireQuota, aiLimiter, wrap(async (req, res) => {
  const { prompt, system, task, max_tokens, json } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  const sanitized = security.sanitizeInput(prompt, { maxLength: 20000 });
  if (!security.isSafe(sanitized)) {
    return res.status(400).json({ error: 'Input contains unsafe content', threats: security.detectThreats(sanitized) });
  }

  const result = await smartCall({
    prompt: sanitized,
    system,
    task,
    max_tokens,
    json,
  });
  res.json(result);
}));

// ─── Cache stats / clear ────────────────────
router.get('/cache/stats', requireAuth, wrap(async (req, res) => {
  res.json(await cache.stats());
}));

router.delete('/cache/clear', requireAuth, wrap(async (req, res) => {
  await cache.clear();
  logger.warn('Cache manually cleared', { user_id: req.user.id });
  res.json({ ok: true });
}));

// ─── DAG Orchestration ──────────────────────
db.prepare(`CREATE TABLE IF NOT EXISTS orchestrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  graph TEXT NOT NULL,
  results TEXT,
  status TEXT DEFAULT 'running',
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
)`).run();

router.post('/orchestrate', requireAuth, requireQuota, aiLimiter, wrap(async (req, res) => {
  const { name, graph } = req.body;
  if (!graph || typeof graph !== 'object') return res.status(400).json({ error: 'Missing graph' });

  const stream = sse.createStream(res);

  const orchId = db.prepare(`INSERT INTO orchestrations (user_id, name, graph) VALUES (?, ?, ?)`)
    .run(req.user.id, name || 'orchestration', JSON.stringify(graph)).lastInsertRowid;

  stream.send('orchestration_id', { id: orchId });

  try {
    const orch = createOrchestrator(graph, {
      onEvent: (e) => stream.send(e.type, e),
      userId: req.user.id,
    });
    const { results, errors, summary } = await orch.run();

    db.prepare(`UPDATE orchestrations SET results = ?, status = 'completed', completed_at = datetime('now') WHERE id = ?`)
      .run(JSON.stringify(results), orchId);

    stream.done({ results, errors, summary });
  } catch (e) {
    db.prepare(`UPDATE orchestrations SET status = 'failed' WHERE id = ?`).run(orchId);
    logger.error('Orchestration failed', { user_id: req.user.id, error: e.message });
    stream.error(e.message);
    stream.close();
  }
}));

// ═══════════════════════════════════════════════════════════
// ⚡ ONE-PROMPT EXPERIENCE — Hero Feature
// ═══════════════════════════════════════════════════════════
router.post('/one-prompt', requireAuth, requireQuota, aiLimiter, wrap(async (req, res) => {
  const { prompt: rawPrompt } = req.body;
  if (!rawPrompt) return res.status(400).json({ error: 'Missing prompt' });

  const prompt = security.sanitizeInput(rawPrompt, { maxLength: 5000 });
  if (!security.isSafe(prompt)) {
    return res.status(400).json({ error: 'Input contains unsafe content' });
  }

  const stream = sse.createStream(res);

  // PHASE 1: Detect intent (cached)
  stream.send('phase', { name: 'understanding', label: '🧠 Understanding your request...' });

  let intent;
  try {
    const intentResult = await smartCall({
      prompt: `Classify this user request and extract details. Return JSON:
{
  "intent": "build_startup | build_app | research | analyze | write | code | design | other",
  "domain": "industry/area",
  "scope": "minimal | standard | comprehensive",
  "key_requirements": ["..."],
  "expected_deliverables": ["..."],
  "name_suggestion": "short product name",
  "confidence": 0-100
}

Request: ${prompt}`,
      task: 'classification',
      json: true,
      cacheTTL: 7200,
    });
    intent = intentResult.output;
  } catch (e) {
    stream.error('Failed to understand: ' + e.message);
    stream.close();
    return;
  }

  stream.send('intent_detected', { intent });

  // PHASE 2: Build user context
  const userContext = memory.buildContext(req.user.id);

  // PHASE 3: Build graph dynamically
  stream.send('phase', { name: 'planning', label: '📋 Building execution plan...' });

  let graph;
  if (intent.intent === 'build_startup' || intent.intent === 'build_app') {
    graph = buildStartupGraph(prompt, intent, userContext);
  } else if (intent.intent === 'research' || intent.intent === 'analyze') {
    graph = buildResearchGraph(prompt, intent, userContext);
  } else if (intent.intent === 'code') {
    graph = buildCodeGraph(prompt, intent, userContext);
  } else {
    graph = buildGenericGraph(prompt, intent, userContext);
  }

  stream.send('graph_ready', { node_count: Object.keys(graph).length });

  // PHASE 4: Execute orchestration
  const orch = createOrchestrator(graph, {
    onEvent: (e) => stream.send('execution', { event: e }),
    userId: req.user.id,
    maxRetries: 2,
  });

  try {
    const { results, errors, summary } = await orch.run();

    // PHASE 5: Save as project if buildable
    let projectId = null;
    let shareId = null;
    if (intent.intent === 'build_startup' || intent.intent === 'build_app') {
      try {
        shareId = crypto.randomBytes(8).toString('hex');
        projectId = db.prepare(`INSERT INTO agent_projects (user_id, share_id, name, idea, status) VALUES (?, ?, ?, ?, 'completed')`)
          .run(req.user.id, shareId, intent.name_suggestion || prompt.slice(0, 60), prompt).lastInsertRowid;

        const agentMap = {
          strategy: 'CEO Agent', product_spec: 'Product Agent', design: 'Design Agent',
          backend: 'Dev Agent', frontend: 'Dev Agent',
          marketing: 'Marketing Agent', deploy_config: 'Deploy Agent',
        };
        for (const [key, value] of Object.entries(results)) {
          const agentName = agentMap[key] || key;
          const output = key === 'design' && value?.landing_html
            ? { landing_page_html: value.landing_html, ...value }
            : value;
          db.prepare(`INSERT INTO agent_steps (project_id, agent_name, step_name, status, output, duration_ms) VALUES (?, ?, ?, 'completed', ?, ?)`)
            .run(projectId, agentName, key, JSON.stringify(output), 0);
        }
      } catch (e) {
        logger.warn('Could not save project', { error: e.message });
      }
    }

    stream.done({
      intent,
      results,
      errors,
      project_id: projectId,
      share_id: shareId,
      summary: `✨ ${intent.name_suggestion || 'Project'} ready! ${Object.keys(results).length} components in ${(summary.duration_ms / 1000).toFixed(1)}s.`,
    });
  } catch (e) {
    logger.error('One-Prompt failed', { user_id: req.user.id, error: e.message });
    stream.error(e.message);
    stream.close();
  }
}));

// ─── Graph builders ─────────────────────────
function buildStartupGraph(prompt, intent, userCtx) {
  return {
    strategy: {
      task: 'reasoning-deep', json: true,
      system: `${userCtx}You are the CEO Agent. Strategic thinker.`,
      prompt: `Define startup strategy for: "${prompt}"\nDomain: ${intent.domain}\n\nReturn JSON: {"vision":"...","mission":"...","target_market":"...","value_prop":"...","differentiators":["..."],"revenue_model":"..."}`,
    },
    product_spec: {
      task: 'reasoning-deep', json: true,
      depends_on: ['strategy'],
      system: 'You are the Product Agent.',
      prompt: (ctx) => `Design product spec for: "${prompt}"\n\nStrategy:\n${JSON.stringify(ctx.strategy).slice(0, 1500)}\n\nReturn JSON: {"name":"...","tagline":"...","features":[{"name":"...","desc":"...","priority":"P0/P1"}],"user_personas":[{"name":"...","needs":["..."]}],"mvp_scope":["..."]}`,
    },
    design: {
      task: 'creative', json: true, max_tokens: 4000,
      depends_on: ['product_spec'],
      system: 'You are the Design Agent. Premium dark UI/UX expert.',
      prompt: (ctx) => `Generate complete dark-themed landing page HTML for "${ctx.product_spec?.name || 'startup'}".\nValue: ${ctx.product_spec?.tagline || prompt}\n\nReturn JSON: {"landing_html":"COMPLETE HTML with hero, 6 features, 3 pricing tiers, CTA. Use lime/cyan gradient.","brand_colors":["#c6f135","#35f1c6"]}`,
    },
    backend: {
      task: 'coding-strong', json: true, max_tokens: 4000,
      depends_on: ['product_spec'],
      system: 'You are the Dev Agent. Senior backend engineer.',
      prompt: (ctx) => `Generate Node.js + Express + SQLite backend for: "${prompt}"\n\nFeatures: ${JSON.stringify(ctx.product_spec?.features || []).slice(0, 1000)}\n\nReturn JSON: {"server_js":"complete server.js with auth, CRUD","schema":"CREATE TABLE...","package_json":"...","env_example":"..."}`,
    },
    frontend: {
      task: 'coding-strong', json: true, max_tokens: 4000,
      depends_on: ['product_spec'],
      system: 'You are the Frontend Agent. Senior React engineer.',
      prompt: (ctx) => `Generate React frontend for: "${prompt}"\n\nFeatures: ${JSON.stringify(ctx.product_spec?.features || []).slice(0, 1000)}\n\nReturn JSON: {"app_jsx":"complete React app","components":["..."],"package_json":"..."}`,
    },
    marketing: {
      task: 'creative', json: true,
      depends_on: ['strategy', 'product_spec'],
      system: 'You are the Marketing Agent.',
      prompt: (ctx) => `Generate viral launch package for "${ctx.product_spec?.name}".\n\nReturn JSON: {"twitter_thread":["tweet 1"],"product_hunt":{"tagline":"...","description":"..."},"linkedin_post":"...","email_sequence":[{"day":0,"subject":"...","body":"..."}]}`,
    },
    deploy_config: {
      task: 'coding-fast', json: true,
      depends_on: ['backend'],
      system: 'You are the Deploy Agent. DevOps expert.',
      prompt: (ctx) => `Generate deployment configs.\n\nReturn JSON: {"dockerfile":"FROM node:20...","docker_compose":"...","github_actions":"...","vercel_json":"...","railway_json":"...","readme":"..."}`,
    },
  };
}

function buildResearchGraph(prompt, intent, userCtx) {
  return {
    research: {
      task: 'reasoning-deep', json: true,
      system: `${userCtx}You are a Research Agent.`,
      prompt: `Deep research: "${prompt}"\n\nReturn JSON: {"key_findings":["..."],"data_points":["..."],"insights":["..."],"sources_to_verify":["..."]}`,
    },
    analysis: {
      task: 'reasoning-deep', json: true,
      depends_on: ['research'],
      system: 'You are an Analyst Agent.',
      prompt: (ctx) => `Analyze findings:\n${JSON.stringify(ctx.research).slice(0, 2000)}\n\nReturn JSON: {"patterns":["..."],"implications":["..."],"recommendations":["..."]}`,
    },
    report: {
      task: 'creative',
      depends_on: ['analysis'],
      system: 'You are a Writer Agent.',
      prompt: (ctx) => `Write comprehensive report:\n\nResearch:\n${JSON.stringify(ctx.research).slice(0, 1500)}\n\nAnalysis:\n${JSON.stringify(ctx.analysis).slice(0, 1500)}`,
    },
  };
}

function buildCodeGraph(prompt, intent, userCtx) {
  return {
    plan: {
      task: 'reasoning-deep', json: true,
      system: `${userCtx}You are a Software Architect.`,
      prompt: `Plan implementation for: "${prompt}"\n\nReturn JSON: {"language":"...","framework":"...","files_needed":["..."],"approach":"..."}`,
    },
    code: {
      task: 'coding-strong', max_tokens: 4000,
      depends_on: ['plan'],
      system: 'Senior Engineer. Write production-grade code.',
      prompt: (ctx) => `Implement: "${prompt}"\n\nPlan:\n${JSON.stringify(ctx.plan).slice(0, 1500)}\n\nWrite complete, working code.`,
    },
    tests: {
      task: 'coding-fast',
      depends_on: ['code'],
      system: 'You are a QA Engineer.',
      prompt: (ctx) => `Write tests for this code:\n${String(ctx.code).slice(0, 3000)}`,
      required: false,
    },
  };
}

function buildGenericGraph(prompt, intent, userCtx) {
  return {
    response: {
      task: 'reasoning-deep',
      system: `${userCtx}You are a helpful expert assistant.`,
      prompt,
    },
  };
}

// ─── Security/Sanitization helper ─────────────
router.post('/sanitize', requireAuth, wrap(async (req, res) => {
  const { input } = req.body;
  if (!input) return res.status(400).json({ error: 'Missing input' });
  res.json({
    safe: security.isSafe(input),
    threats: security.detectThreats(input),
    sanitized: security.sanitizeInput(input),
  });
}));

// ─── System Health ────────────────────────────
router.get('/health', wrap(async (req, res) => {
  const memUsage = process.memoryUsage();
  const cacheStats = await cache.stats();

  let recentOrch = {};
  try {
    recentOrch = db.prepare(`SELECT status, COUNT(*) as c FROM orchestrations WHERE created_at > datetime('now','-24 hours') GROUP BY status`)
      .all().reduce((acc, r) => { acc[r.status] = r.c; return acc; }, {});
  } catch (_) {}

  res.json({
    status: 'healthy',
    uptime_seconds: Math.floor(process.uptime()),
    memory: {
      rss_mb: (memUsage.rss / 1024 / 1024).toFixed(1),
      heap_used_mb: (memUsage.heapUsed / 1024 / 1024).toFixed(1),
    },
    cache: cacheStats,
    providers: modelRouter.PROVIDERS,
    queues_type: queues.useBullMQ ? 'BullMQ+Redis' : 'in-process',
    orchestrations_24h: recentOrch,
    timestamp: new Date().toISOString(),
  });
}));

// ─── Job queue endpoints ──────────────────────
router.post('/jobs/enqueue', requireAuth, wrap(async (req, res) => {
  const { queue: queueName, name, data, delay = 0 } = req.body;
  if (!queueName || !name) return res.status(400).json({ error: 'Missing queue/name' });

  const job = await queues.enqueue(queueName, name, { ...data, _user_id: req.user.id }, { delay });
  res.json({ ok: true, job_id: job.id });
}));

router.get('/jobs/stats/:queue', requireAuth, wrap(async (req, res) => {
  const stats = await queues.stats(req.params.queue);
  res.json(stats || { error: 'Queue not found' });
}));

return router;
};