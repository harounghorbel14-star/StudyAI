const express = require('express');

module.exports = function coreSystemRoutes(
  db,
  openai,
  services,
  requireAuth,
  requireQuota,
  aiLimiter,
  wrap
) {
  const router = express.Router();

  // ─────────────────────────────────────────────
  // HEALTH
  // GET /api/core/health
  // ─────────────────────────────────────────────
  router.get('/health', requireAuth, wrap(async (req, res) => {
    const health = {
      status: 'ok',
      service: 'core-system',
      uptime_seconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      cache: false,
      orchestrator: !!services?.createOrchestrator,
      smart_call: !!services?.smartCall,
    };

    if (services?.cache) {
      health.cache = true;
    }

    res.json(health);
  }));

  // ─────────────────────────────────────────────
  // CACHE STATS
  // GET /api/core/cache/stats
  // ─────────────────────────────────────────────
  router.get('/cache/stats', requireAuth, wrap(async (req, res) => {
    if (!services?.cache || typeof services.cache.stats !== 'function') {
      return res.json({
        memory_size: 0,
        max_memory: 0,
        hits: 0,
        misses: 0,
        sets: 0,
        hit_rate: '0%',
        redis_available: false,
        redis_errors: 0
      });
    }

    const stats = await services.cache.stats();
    res.json(stats || {});
  }));

  // ─────────────────────────────────────────────
  // CACHE CLEAR
  // DELETE /api/core/cache/clear
  // ─────────────────────────────────────────────
  router.delete(
    '/cache/clear',
    requireAuth,
    wrap(async (req, res) => {
      if (!services?.cache || typeof services.cache.clear !== 'function') {
        return res.status(503).json({
          error: 'Cache service unavailable.'
        });
      }

      await services.cache.clear();

      res.json({
        ok: true,
        message: 'Core cache cleared.'
      });
    })
  );

  // ─────────────────────────────────────────────
  // ONE-PROMPT
  // POST /api/core/one-prompt
  // ─────────────────────────────────────────────
  router.post(
    '/one-prompt',
    requireAuth,
    requireQuota,
    aiLimiter,
    wrap(async (req, res) => {
      const prompt = typeof req.body?.prompt === 'string'
        ? req.body.prompt.trim()
        : '';

      if (!prompt) {
        return res.status(400).json({
          error: 'Prompt is required.'
        });
      }

      if (!services?.smartCall) {
        return res.status(503).json({
          error: 'AI core is not initialized.'
        });
      }

      if (!services?.createOrchestrator) {
        return res.status(503).json({
          error: 'Orchestrator is not initialized.'
        });
      }

      // SSE
      res.status(200);
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      if (typeof res.flushHeaders === 'function') {
        res.flushHeaders();
      }

      let closed = false;

      const send = (type, payload = {}) => {
        if (closed || res.writableEnded) return;

        res.write(
          `data: ${JSON.stringify({
            type,
            ...payload
          })}\n\n`
        );
      };

      const userId =
        req.user?.id ??
        req.user?.user_id ??
        req.user?.userId ??
        null;

      req.on('close', () => {
        closed = true;
      });

      try {
        send('phase', {
          phase: 'understanding',
          message: 'Understanding your request...'
        });

        // ─────────────────────────────────────
        // INTENT DETECTION
        // ─────────────────────────────────────
        let intent = {
          type: 'general',
          complexity: 'medium',
          needs_design: false,
          needs_code: false
        };

        try {
          const intentResult = await services.smartCall({
            user_id: userId,
            task: 'classification',
            json: true,
            max_tokens: 500,
            temperature: 0,
            cacheable: true,
            prompt: `
Analyze this NexusAI request and classify it.

Return ONLY valid JSON:
{
  "type": "general|website|coding|business|research|content|automation|strategy",
  "complexity": "low|medium|high",
  "needs_design": true,
  "needs_code": true
}

USER REQUEST:
${prompt}
`
          });

          if (intentResult?.output) {
            const parsed =
              typeof intentResult.output === 'string'
                ? JSON.parse(intentResult.output)
                : intentResult.output;

            if (parsed && typeof parsed === 'object') {
              intent = {
                ...intent,
                ...parsed
              };
            }
          }
        } catch (err) {
          // Safe fallback — the actual task can still run.
          intent = {
            type: 'general',
            complexity: 'medium',
            needs_design: false,
            needs_code: false
          };
        }

        send('intent_detected', {
          intent
        });

        // ─────────────────────────────────────
        // BUILD EXECUTION GRAPH
        // ─────────────────────────────────────
        const graph = {};

        graph.planner = {
          depends_on: [],
          task: 'reasoning-deep',
          system: `
You are NexusAI Planner.

Turn the user's request into a precise execution plan.
Think operationally.
Identify the desired outcome, constraints, important steps,
dependencies, risks and the best final deliverable.

Return structured JSON.
`,
          prompt: `
USER REQUEST:
${prompt}

INTENT:
${JSON.stringify(intent)}
`,
          json: true,
          max_tokens: 1800,
          cacheable: true
        };

        if (intent.needs_design || intent.type === 'website') {
          graph.design = {
            depends_on: ['planner'],
            task: 'creative',
            system: `
You are NexusAI Design Agent.

Create a premium, production-oriented UI/UX direction.
If the request requires a landing page, produce a complete
self-contained landing_page_html string.

Return JSON.
`,
            prompt: ctx => `
USER REQUEST:
${prompt}

PLANNER OUTPUT:
${JSON.stringify(ctx.planner)}

Create the appropriate design deliverable.
If HTML is appropriate, return:

{
  "landing_html": "<complete self-contained HTML>",
  "design_summary": "...",
  "components": []
}
`,
            json: true,
            max_tokens: 5000,
            cacheable: true
          };
        }

        if (
          intent.needs_code ||
          intent.type === 'coding' ||
          intent.type === 'automation'
        ) {
          graph.developer = {
            depends_on: ['planner'],
            task: 'coding',
            system: `
You are NexusAI Developer Agent.

Produce production-quality technical implementation guidance.
Respect the existing architecture.
Do not invent dependencies unnecessarily.

Return JSON.
`,
            prompt: ctx => `
USER REQUEST:
${prompt}

PLAN:
${JSON.stringify(ctx.planner)}

Produce the technical implementation.
`,
            json: true,
            max_tokens: 3500,
            cacheable: true
          };
        }

        graph.finalizer = {
          depends_on: Object.keys(graph).filter(
            key => key !== 'finalizer'
          ),
          task: 'reasoning-deep',
          system: `
You are NexusAI Finalizer.

Synthesize the outputs from the other agents into one clear,
useful final result.

Do not lose important information.
Be concise but operationally useful.

Return JSON:
{
  "summary": "...",
  "next_steps": [],
  "deliverables": {}
}
`,
          prompt: ctx => `
USER REQUEST:
${prompt}

AGENT OUTPUTS:
${JSON.stringify(ctx)}
`,
          json: true,
          max_tokens: 3000,
          cacheable: true
        };

        send('graph_ready', {
          graph: Object.keys(graph).map(name => ({
            node: name,
            depends_on: graph[name].depends_on || []
          }))
        });

        // ─────────────────────────────────────
        // RUN ORCHESTRATOR
        // ─────────────────────────────────────
        const orchestrator = services.createOrchestrator(graph, {
          userId,
          onEvent: event => {
            if (closed) return;

            send('execution', {
              event
            });
          }
        });

        const result = await orchestrator.run();

        if (closed) return;

        // Try to expose a useful project identifier when available.
        let projectId = null;

        try {
          if (services.projects) {
            const p = services.projects;

            if (typeof p.create === 'function') {
              const project = await p.create({
                user_id: userId,
                name: prompt.slice(0, 100),
                description: prompt
              });

              projectId =
                project?.id ??
                project?.project_id ??
                null;
            }
          }
        } catch (_) {
          // Project persistence is optional for this first Core System route.
        }

        send('complete', {
          project_id: projectId,
          summary: result.summary || {},
          results: result.results || {},
          errors: result.errors || {},
          metrics: result.metrics || {}
        });

        res.end();
      } catch (err) {
        if (!closed && !res.writableEnded) {
          send('error', {
            error: err?.message || 'One-Prompt execution failed.'
          });

          res.end();
        }
      }
    })
  );

  return router;
};
