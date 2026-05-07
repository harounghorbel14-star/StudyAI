// ============================================================
// 🧠 CORE OPTIMIZATION — routes/core-system.js
// Model Router · Smart Orchestrator · Cache · One-Prompt
// ============================================================
const express = require('express');
const router = express.Router();
const crypto = require('crypto');

module.exports = (db, openai, requireAuth, requireQuota, aiLimiter, wrap, chatComplete) => {

// ═══════════════════════════════════════════════════════════
// 🧠 INTELLIGENT MODEL ROUTER
// ═══════════════════════════════════════════════════════════
const MODEL_REGISTRY = {
  'reasoning-deep':    { model: 'gpt-4o',         cost: 5,  speed: 3, quality: 10 },
  'reasoning-fast':    { model: 'gpt-4o-mini',    cost: 1,  speed: 9, quality: 7 },
  'coding-strong':     { model: 'gpt-4o',         cost: 5,  speed: 4, quality: 10 },
  'coding-fast':       { model: 'gpt-4o-mini',    cost: 1,  speed: 9, quality: 7 },
  'creative':          { model: 'gpt-4o',         cost: 5,  speed: 4, quality: 10 },
  'extraction':        { model: 'gpt-4o-mini',    cost: 1,  speed: 9, quality: 8 },
  'classification':    { model: 'gpt-4o-mini',    cost: 1,  speed: 9, quality: 9 },
  'summarization':     { model: 'gpt-4o-mini',    cost: 1,  speed: 9, quality: 8 },
  'embedding':         { model: 'text-embedding-3-small', cost: 0.1, speed: 10, quality: 9 },
};

const TASK_PATTERNS = [
  { keywords: ['debug', 'fix bug', 'error', 'why does', 'troubleshoot'],          task: 'reasoning-deep' },
  { keywords: ['code', 'function', 'class', 'implement', 'build', 'algorithm'],   task: 'coding-strong' },
  { keywords: ['quick', 'short', 'brief', 'tldr', 'summary'],                     task: 'summarization' },
  { keywords: ['extract', 'parse', 'find', 'list'],                               task: 'extraction' },
  { keywords: ['classify', 'categorize', 'is this', 'detect'],                    task: 'classification' },
  { keywords: ['write', 'story', 'creative', 'poem', 'imagine'],                  task: 'creative' },
  { keywords: ['plan', 'analyze', 'compare', 'evaluate', 'decide'],               task: 'reasoning-deep' },
];

function detectTask(prompt, hint) {
  if (hint && MODEL_REGISTRY[hint]) return hint;
  const lower = String(prompt || '').toLowerCase();
  for (const { keywords, task } of TASK_PATTERNS) {
    if (keywords.some(k => lower.includes(k))) return task;
  }
  // Default by length
  if (lower.length < 200) return 'reasoning-fast';
  return 'reasoning-deep';
}

function selectModel(taskType, options = {}) {
  const task = MODEL_REGISTRY[taskType] || MODEL_REGISTRY['reasoning-fast'];
  return task.model;
}

async function smartCall({ prompt, system, task, max_tokens = 1500, temperature = 0.7, json = false, stream = false }) {
  const taskType = detectTask(prompt, task);
  const model = selectModel(taskType);

  const config = {
    model,
    max_tokens,
    temperature,
    messages: [
      ...(system ? [{ role: 'system', content: system }] : []),
      { role: 'user', content: prompt }
    ],
  };
  if (json) config.response_format = { type: 'json_object' };
  if (stream) config.stream = true;

  return { config, model, taskType };
}

// Public router endpoint
router.post('/route', requireAuth, requireQuota, aiLimiter, wrap(async (req, res) => {
  const { prompt, system, task, max_tokens, json } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  const { config, model, taskType } = await smartCall({ prompt, system, task, max_tokens, json });
  const startTime = Date.now();

  const result = await openai.chat.completions.create(config);
  const duration = Date.now() - startTime;
  const output = result.choices[0]?.message?.content || '';

  res.json({
    output: json ? JSON.parse(output) : output,
    routing: { task_type: taskType, model_used: model, duration_ms: duration },
    usage: result.usage,
  });
}));

// Get model registry
router.get('/models', wrap(async (req, res) => {
  res.json({ registry: MODEL_REGISTRY, patterns: TASK_PATTERNS });
}));

// ═══════════════════════════════════════════════════════════
// ⚡ SMART CACHE (response caching with semantic key)
// ═══════════════════════════════════════════════════════════
db.prepare(`CREATE TABLE IF NOT EXISTS smart_cache (
  cache_key TEXT PRIMARY KEY,
  prompt_hash TEXT NOT NULL,
  response TEXT NOT NULL,
  model TEXT,
  task_type TEXT,
  hits INTEGER DEFAULT 0,
  expires_at INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
)`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_smart_cache_expires ON smart_cache(expires_at)`).run();

const memCache = new Map();
function hashPrompt(text) {
  return crypto.createHash('sha256').update(String(text)).digest('hex').slice(0, 16);
}

function getCached(prompt, system) {
  const key = hashPrompt((system || '') + '||' + prompt);
  const mem = memCache.get(key);
  if (mem && mem.expires > Date.now()) return mem.value;
  if (mem) memCache.delete(key);
  try {
    const row = db.prepare(`SELECT response FROM smart_cache WHERE cache_key = ? AND expires_at > ?`).get(key, Date.now());
    if (row) {
      db.prepare(`UPDATE smart_cache SET hits = hits + 1 WHERE cache_key = ?`).run(key);
      const value = JSON.parse(row.response);
      memCache.set(key, { value, expires: Date.now() + 600000 });
      return value;
    }
  } catch (_) {}
  return null;
}

function setCached(prompt, system, response, model, taskType, ttlSec = 3600) {
  const key = hashPrompt((system || '') + '||' + prompt);
  const expires = Date.now() + ttlSec * 1000;
  memCache.set(key, { value: response, expires });
  if (memCache.size > 500) {
    const firstKey = memCache.keys().next().value;
    memCache.delete(firstKey);
  }
  try {
    db.prepare(`INSERT OR REPLACE INTO smart_cache (cache_key, prompt_hash, response, model, task_type, expires_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(key, key, JSON.stringify(response), model, taskType, expires);
  } catch (_) {}
}

setInterval(() => {
  try { db.prepare(`DELETE FROM smart_cache WHERE expires_at < ?`).run(Date.now()); } catch (_) {}
}, 5 * 60 * 1000);

router.get('/cache/stats', requireAuth, wrap(async (req, res) => {
  const stats = db.prepare(`SELECT COUNT(*) as total, SUM(hits) as total_hits, AVG(hits) as avg_hits FROM smart_cache`).get();
  const top = db.prepare(`SELECT task_type, model, hits FROM smart_cache ORDER BY hits DESC LIMIT 10`).all();
  res.json({ memory_size: memCache.size, ...stats, top_cached: top });
}));

router.delete('/cache/clear', requireAuth, wrap(async (req, res) => {
  memCache.clear();
  db.prepare(`DELETE FROM smart_cache`).run();
  res.json({ ok: true });
}));

// ═══════════════════════════════════════════════════════════
// 🎼 SMART ORCHESTRATOR (DAG execution with retries)
// ═══════════════════════════════════════════════════════════
db.prepare(`CREATE TABLE IF NOT EXISTS orchestrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  graph TEXT NOT NULL,
  results TEXT DEFAULT '{}',
  status TEXT DEFAULT 'running',
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
)`).run();

class Orchestrator {
  constructor(graph, options = {}) {
    this.graph = graph;
    this.results = {};
    this.errors = {};
    this.maxRetries = options.maxRetries || 2;
    this.onEvent = options.onEvent || (() => {});
  }

  // Topological sort with parallel layers
  buildLayers() {
    const layers = [];
    const completed = new Set();
    const remaining = new Set(Object.keys(this.graph));

    while (remaining.size > 0) {
      const layer = [];
      for (const node of remaining) {
        const deps = this.graph[node].depends_on || [];
        if (deps.every(d => completed.has(d))) layer.push(node);
      }
      if (!layer.length) {
        // Circular or missing deps — abort
        throw new Error('Circular dependency or missing nodes: ' + Array.from(remaining).join(','));
      }
      layers.push(layer);
      layer.forEach(n => { completed.add(n); remaining.delete(n); });
    }
    return layers;
  }

  async runNode(nodeName) {
    const node = this.graph[nodeName];
    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries + 1; attempt++) {
      try {
        this.onEvent({ type: 'node_start', node: nodeName, attempt });
        const startTime = Date.now();

        // Build context from dependencies
        const context = {};
        (node.depends_on || []).forEach(dep => { context[dep] = this.results[dep]; });

        // Execute
        const prompt = typeof node.prompt === 'function' ? node.prompt(context) : node.prompt;
        const system = node.system || 'You are an expert AI agent. Respond clearly and accurately.';
        const taskType = detectTask(prompt, node.task);
        const model = selectModel(taskType);

        // Check cache (if cacheable)
        if (node.cacheable !== false) {
          const cached = getCached(prompt, system);
          if (cached) {
            this.results[nodeName] = cached;
            this.onEvent({ type: 'node_done', node: nodeName, cached: true, duration_ms: Date.now() - startTime, model, task_type: taskType });
            return cached;
          }
        }

        const result = await openai.chat.completions.create({
          model,
          max_tokens: node.max_tokens || 1500,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: prompt }
          ],
          response_format: node.json ? { type: 'json_object' } : undefined,
        });

        let output = result.choices[0]?.message?.content || '';
        if (node.json) {
          try { output = JSON.parse(output); }
          catch (_) { output = { raw: output, parse_error: true }; }
        }

        // Validate if validator provided
        if (node.validator) {
          const valid = await this.validate(nodeName, output, node.validator);
          if (!valid.passes && attempt <= this.maxRetries) {
            this.onEvent({ type: 'node_validation_failed', node: nodeName, attempt, reason: valid.reason });
            continue;
          }
        }

        this.results[nodeName] = output;
        if (node.cacheable !== false) setCached(prompt, system, output, model, taskType, node.ttl || 3600);

        this.onEvent({ type: 'node_done', node: nodeName, duration_ms: Date.now() - startTime, model, task_type: taskType, attempt });
        return output;

      } catch (err) {
        lastError = err;
        this.onEvent({ type: 'node_error', node: nodeName, attempt, error: err.message });
        if (attempt > this.maxRetries) {
          // Use fallback if defined
          if (node.fallback) {
            this.results[nodeName] = typeof node.fallback === 'function' ? node.fallback() : node.fallback;
            return this.results[nodeName];
          }
          this.errors[nodeName] = err.message;
          throw err;
        }
        // Wait before retry (exponential backoff)
        await new Promise(r => setTimeout(r, Math.min(1000 * Math.pow(2, attempt - 1), 8000)));
      }
    }
  }

  async validate(nodeName, output, validator) {
    try {
      const result = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 200,
        response_format: { type: 'json_object' },
        messages: [{
          role: 'user',
          content: `Validate this output: ${JSON.stringify(output).slice(0, 1500)}\n\nCriteria: ${validator}\n\nReturn JSON: {"passes":true/false,"reason":"..."}`
        }],
      });
      return JSON.parse(result.choices[0]?.message?.content || '{"passes":true}');
    } catch (_) { return { passes: true }; }
  }

  async run() {
    const layers = this.buildLayers();
    this.onEvent({ type: 'orchestration_start', total_nodes: Object.keys(this.graph).length, layers: layers.length });

    for (let i = 0; i < layers.length; i++) {
      this.onEvent({ type: 'layer_start', layer: i + 1, total_layers: layers.length, parallel_nodes: layers[i] });

      // Run all nodes in this layer in parallel
      await Promise.allSettled(layers[i].map(node => this.runNode(node)));

      this.onEvent({ type: 'layer_done', layer: i + 1 });
    }

    this.onEvent({ type: 'orchestration_complete', results_keys: Object.keys(this.results), errors: this.errors });
    return { results: this.results, errors: this.errors };
  }
}

// Run custom DAG
router.post('/orchestrate', requireAuth, requireQuota, aiLimiter, wrap(async (req, res) => {
  const { name, graph } = req.body;
  if (!graph || typeof graph !== 'object') return res.status(400).json({ error: 'Missing graph' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  const send = (e) => res.write(`data: ${JSON.stringify(e)}\n\n`);

  const orchestrationId = db.prepare(`INSERT INTO orchestrations (user_id, name, graph) VALUES (?, ?, ?)`)
    .run(req.user.id, name || 'orchestration', JSON.stringify(graph)).lastInsertRowid;

  send({ type: 'orchestration_id', id: orchestrationId });

  try {
    const orch = new Orchestrator(graph, { onEvent: send });
    const { results, errors } = await orch.run();

    db.prepare(`UPDATE orchestrations SET results = ?, status = 'completed', completed_at = datetime('now') WHERE id = ?`)
      .run(JSON.stringify(results), orchestrationId);

    send({ type: 'final', results, errors });
    res.end();
  } catch (e) {
    db.prepare(`UPDATE orchestrations SET status = 'failed' WHERE id = ?`).run(orchestrationId);
    send({ type: 'fatal', error: e.message });
    res.end();
  }
}));

// ═══════════════════════════════════════════════════════════
// ⚡ ONE-PROMPT EXPERIENCE
// "Build me a SaaS for restaurants" → end-to-end execution
// ═══════════════════════════════════════════════════════════
router.post('/one-prompt', requireAuth, requireQuota, aiLimiter, wrap(async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  const send = (e) => res.write(`data: ${JSON.stringify(e)}\n\n`);

  // STEP 1: Understand intent
  send({ type: 'phase', name: 'understanding', label: '🧠 Understanding your request...' });
  const intentResult = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 500,
    response_format: { type: 'json_object' },
    messages: [{
      role: 'user',
      content: `Classify this user request and extract details. Return JSON:
{
  "intent": "build_startup/build_app/research/analyze/write/code/design/other",
  "domain": "what industry/area",
  "scope": "minimal/standard/comprehensive",
  "key_requirements": ["..."],
  "implicit_needs": ["..."],
  "expected_deliverables": ["..."],
  "name_suggestion": "short product name",
  "confidence": 0-100
}

Request: ${prompt}`
    }]
  });
  const intent = JSON.parse(intentResult.choices[0]?.message?.content || '{}');
  send({ type: 'intent_detected', intent });

  // STEP 2: Build execution graph dynamically based on intent
  send({ type: 'phase', name: 'planning', label: '📋 Building execution plan...' });

  let graph;
  if (intent.intent === 'build_startup' || intent.intent === 'build_app') {
    // Full multi-agent startup pipeline
    graph = {
      strategy: {
        prompt: `Define startup strategy for: "${prompt}". Domain: ${intent.domain}. Return JSON: {"vision":"...","mission":"...","target_market":"...","value_prop":"...","differentiators":["..."],"revenue_model":"..."}`,
        system: 'CEO Agent. Strategic thinker.',
        task: 'reasoning-deep', json: true,
      },
      product_spec: {
        prompt: (ctx) => `Design product spec based on strategy: ${JSON.stringify(ctx.strategy).slice(0, 1500)}\n\nFor: "${prompt}"\n\nReturn JSON: {"name":"...","tagline":"...","features":[{"name":"...","desc":"...","priority":"P0/P1"}],"user_personas":[{"name":"...","needs":["..."]}],"mvp_scope":["..."]}`,
        system: 'Product Manager. Detail-oriented.',
        task: 'reasoning-deep', json: true,
        depends_on: ['strategy'],
      },
      design: {
        prompt: (ctx) => `Generate complete dark-themed landing page HTML for "${ctx.product_spec?.name || 'startup'}".\nValue prop: ${ctx.strategy?.value_prop || prompt}\n\nReturn JSON: {"landing_html":"COMPLETE HTML with hero, 6 features, 3 pricing tiers, CTA","brand_colors":["#c6f135","#35f1c6"],"font":"Inter"}`,
        system: 'Senior UI/UX designer. Premium dark theme expert.',
        task: 'creative', json: true, max_tokens: 4000,
        depends_on: ['product_spec'],
      },
      backend: {
        prompt: (ctx) => `Generate complete Node.js + Express + SQLite backend for: "${prompt}"\n\nFeatures: ${JSON.stringify(ctx.product_spec?.features || []).slice(0, 1000)}\n\nReturn JSON: {"server_js":"complete server.js","schema":"CREATE TABLE...","package_json":"...","env_example":"..."}`,
        system: 'Senior backend engineer.',
        task: 'coding-strong', json: true, max_tokens: 4000,
        depends_on: ['product_spec'],
      },
      frontend: {
        prompt: (ctx) => `Generate React frontend for: "${prompt}"\n\nFeatures: ${JSON.stringify(ctx.product_spec?.features || []).slice(0, 1000)}\n\nReturn JSON: {"app_jsx":"complete React app","components":["..."],"package_json":"..."}`,
        system: 'Senior React engineer.',
        task: 'coding-strong', json: true, max_tokens: 4000,
        depends_on: ['product_spec'],
      },
      marketing: {
        prompt: (ctx) => `Generate viral launch package for "${ctx.product_spec?.name}".\n\nReturn JSON: {"twitter_thread":["tweet 1",...],"product_hunt":{"tagline":"...","description":"..."},"linkedin_post":"...","email_sequence":[{"day":0,"subject":"...","body":"..."}]}`,
        system: 'Growth marketing expert.',
        task: 'creative', json: true,
        depends_on: ['strategy', 'product_spec'],
      },
      deploy_config: {
        prompt: (ctx) => `Generate deployment configs.\n\nReturn JSON: {"dockerfile":"...","docker_compose":"...","github_actions":"...","vercel_json":"...","railway_json":"...","readme":"# ${ctx.product_spec?.name || 'Project'}\\n..."}`,
        system: 'DevOps engineer.',
        task: 'coding-fast', json: true,
        depends_on: ['backend'],
      },
    };
  } else if (intent.intent === 'research' || intent.intent === 'analyze') {
    graph = {
      research: {
        prompt: `Deep research: "${prompt}"\n\nReturn JSON: {"key_findings":["..."],"data_points":["..."],"sources_to_check":["..."],"insights":["..."]}`,
        task: 'reasoning-deep', json: true,
      },
      analysis: {
        prompt: (ctx) => `Analyze findings: ${JSON.stringify(ctx.research).slice(0, 2000)}\n\nReturn JSON: {"patterns":["..."],"implications":["..."],"recommendations":["..."]}`,
        task: 'reasoning-deep', json: true,
        depends_on: ['research'],
      },
      report: {
        prompt: (ctx) => `Write comprehensive report based on:\n${JSON.stringify(ctx.analysis).slice(0, 2000)}`,
        task: 'creative',
        depends_on: ['analysis'],
      },
    };
  } else {
    // Generic single-task flow
    graph = {
      task: { prompt, task: 'reasoning-deep' },
    };
  }

  send({ type: 'graph_ready', node_count: Object.keys(graph).length, intent: intent.intent });

  // STEP 3: Execute orchestration
  const orch = new Orchestrator(graph, {
    onEvent: (e) => send({ type: 'execution', event: e }),
    maxRetries: 2,
  });

  try {
    const { results, errors } = await orch.run();

    // STEP 4: Save as project if it's a build request
    let projectId = null;
    if (intent.intent === 'build_startup' || intent.intent === 'build_app') {
      const shareId = crypto.randomBytes(8).toString('hex');
      try {
        projectId = db.prepare(`INSERT INTO agent_projects (user_id, share_id, name, idea, status) VALUES (?, ?, ?, ?, 'completed')`)
          .run(req.user.id, shareId, intent.name_suggestion || prompt.slice(0, 60), prompt).lastInsertRowid;

        // Save each agent step
        const agentMap = { strategy: 'CEO Agent', product_spec: 'Product Agent', design: 'Design Agent', backend: 'Dev Agent', frontend: 'Dev Agent', marketing: 'Marketing Agent', deploy_config: 'Deploy Agent' };
        for (const [key, value] of Object.entries(results)) {
          const agentName = agentMap[key] || key;
          // Map design output for compatibility
          const output = key === 'design' && value?.landing_html
            ? { landing_page_html: value.landing_html, ...value }
            : value;
          db.prepare(`INSERT INTO agent_steps (project_id, agent_name, step_name, status, output, duration_ms) VALUES (?, ?, ?, 'completed', ?, 0)`)
            .run(projectId, agentName, key, JSON.stringify(output));
        }
      } catch (e) { /* table may not exist */ }
    }

    send({
      type: 'complete',
      intent,
      results,
      errors,
      project_id: projectId,
      summary: `✨ ${intent.name_suggestion || 'Project'} ready! Generated ${Object.keys(results).length} components.`,
    });
    res.end();
  } catch (e) {
    send({ type: 'error', error: e.message });
    res.end();
  }
}));

// ═══════════════════════════════════════════════════════════
// 🛡️ SECURITY + VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════
router.post('/sanitize', requireAuth, wrap(async (req, res) => {
  const { input, type = 'general' } = req.body;
  if (!input) return res.status(400).json({ error: 'Missing input' });

  // Basic sanitization rules
  const checks = {
    has_script_tag: /<script[\s\S]*?>/i.test(input),
    has_sql_injection: /('|"|;|--|\/\*|union\s+select|drop\s+table)/i.test(input),
    has_path_traversal: /(\.\.\/|\.\.\\)/i.test(input),
    too_long: input.length > 10000,
    contains_pii: /(\b\d{3}-\d{2}-\d{4}\b|\b\d{16}\b|password\s*[:=])/i.test(input),
  };

  const safe = !Object.values(checks).some(v => v);
  res.json({ safe, checks, sanitized: safe ? input : input.replace(/<script[\s\S]*?<\/script>/gi, '') });
}));

// ═══════════════════════════════════════════════════════════
// 📊 SYSTEM HEALTH MONITORING
// ═══════════════════════════════════════════════════════════
router.get('/health', wrap(async (req, res) => {
  const memUsage = process.memoryUsage();
  const cacheStats = db.prepare(`SELECT COUNT(*) as size, SUM(hits) as hits FROM smart_cache`).get();
  const recentJobs = db.prepare(`SELECT status, COUNT(*) as c FROM background_jobs WHERE created_at > datetime('now','-1 hour') GROUP BY status`).all().reduce((acc, r) => { acc[r.status] = r.c; return acc; }, {});
  const recentOrch = db.prepare(`SELECT status, COUNT(*) as c FROM orchestrations WHERE created_at > datetime('now','-24 hours') GROUP BY status`).all().reduce((acc, r) => { acc[r.status] = r.c; return acc; }, {});

  res.json({
    status: 'healthy',
    uptime_seconds: Math.floor(process.uptime()),
    memory: {
      rss_mb: (memUsage.rss / 1024 / 1024).toFixed(1),
      heap_used_mb: (memUsage.heapUsed / 1024 / 1024).toFixed(1),
    },
    cache: {
      memory_size: memCache.size,
      db_size: cacheStats.size,
      total_hits: cacheStats.hits || 0,
    },
    jobs_last_hour: recentJobs,
    orchestrations_24h: recentOrch,
    timestamp: new Date().toISOString(),
  });
}));

return router;
};