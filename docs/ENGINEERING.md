# NexusAI — Engineering Documentation

Production-grade AI Operating System. This document is the contract for how the codebase is structured and how to contribute safely.

---

## Architecture Overview

NexusAI is a Node.js/Express backend with a vanilla JS frontend (PWA). The system is organized into **isolated, single-responsibility modules** under specific top-level folders.

```
backend/
├── server.js                    # Express init + route mounting (LIGHT)
├── services/                    # Business logic (the brain)
│   ├── index.js                 # Composition root - wires all services
│   ├── cache.js                 # Upstash Redis + memory LRU
│   ├── memory.js                # Long-term + graph + execution history
│   ├── orchestrator.js          # DAG execution engine
│   ├── compound-intelligence.js # Multi-model reasoning + validation
│   ├── event-bus.js             # Pub/sub for system cohesion
│   ├── contracts.js             # Unified schemas (single source of truth)
│   ├── tracer.js                # Distributed tracing (replay)
│   ├── adaptive.js              # Usage learning
│   ├── knowledge.js             # Tavily-based RAG with citations
│   ├── backup.js                # Disaster recovery
│   ├── cost-optimizer.js        # AI spend tracking & budgets
│   ├── health-monitor.js        # Auto-diagnostics
│   └── logger.js                # Pino structured logging
│
├── router/
│   └── model-router.js          # Multi-provider routing (OpenAI/Claude/DeepSeek)
│
├── agents/
│   └── registry.js              # 16 specialized AI employees
│
├── queues/
│   └── queue.js                 # BullMQ (Redis) → in-process fallback
│
├── workers/
│   └── index.js                 # Background job handlers
│
├── security/
│   ├── middleware.js            # helmet, rate limits, sanitization
│   ├── audit.js                 # Tamper-evident audit log
│   ├── rbac.js                  # Role-based access control
│   └── protection.js            # Bot detection, abuse prevention
│
├── realtime/
│   └── sse.js                   # Unified SSE streaming
│
├── monitoring/
│   └── metrics.js               # Counters, histograms, Sentry/PostHog
│
├── resilience/
│   └── circuit-breaker.js       # Per-provider fault tolerance
│
└── routes/                      # HTTP endpoints (thin controllers)
    ├── core-system.js           # /api/core
    ├── intelligence.js          # /api/intelligence
    ├── system.js                # /api/system (tracer, events, adaptive)
    ├── security.js              # /api/security (admin only)
    ├── deploy-engine.js         # /api/deploy
    ├── agents-system.js         # /api/agents
    ├── payments-and-agents.js   # /api/billing
    ├── ai-os-core.js            # /api/ai-os
    ├── mega-agent.js            # /api/mega
    ├── files.js                 # /api/files
    ├── devtools.js              # /api/devtools
    └── ux-saas.js               # /api/ux
```

### Key Architectural Rules

1. **Routes are thin** — they only handle HTTP concerns. All business logic lives in `services/`.
2. **Services don't import routes** — strict one-way dependency.
3. **`services/index.js` is the single composition root** — only place where services get instantiated and wired.
4. **Every subsystem speaks the event bus** — for cohesion, emit standardized events from `EVENTS` constant.
5. **All schemas come from `services/contracts.js`** — single source of truth for `makeAIResult`, `makeAgentResult`, etc.

---

## Core Patterns

### Adding a new feature

**Decision tree:**
- Is it new business logic? → Add to `services/<feature>.js`, wire in `services/index.js`.
- Is it a new HTTP endpoint? → Add to existing route file in `routes/`, or create new one.
- Is it a new background job? → Register handler in `workers/index.js`.
- Is it a new agent? → Add to `agents/registry.js`.

### `smartCall` is the only way to call AI

Never call `openai.chat.completions.create()` directly from a route. Always use `services.smartCall()`. It provides:
- Multi-provider routing (auto-fallback)
- Cache (Upstash Redis)
- Circuit breaker per provider
- Cost tracking
- Adaptive learning
- Standardized result schema (`ai_result_v1`)

```javascript
const result = await services.smartCall({
  prompt: 'analyze this',
  task: 'reasoning-deep',  // optional - auto-detected from prompt
  json: true,              // forces JSON response
  cacheable: true,         // default true
  user_id: req.user.id,    // for cost tracking
});
// result.output, result.model, result.provider, result.duration_ms
```

### Orchestration uses DAGs

Don't write sequential AI calls. Build a graph:

```javascript
const graph = {
  research: { task: 'reasoning-deep', prompt: '...' },
  analyze: { task: 'reasoning-deep', prompt: ctx => `Based on ${ctx.research}...`, depends_on: ['research'] },
  report:  { task: 'creative', prompt: ctx => `Write report from ${ctx.analyze}`, depends_on: ['analyze'] },
};
const orch = services.createOrchestrator(graph, { onEvent: e => stream.send(e.type, e) });
const { results, errors, summary } = await orch.run();
```

The orchestrator handles topological sort, parallel layers, retries, validators, and tracing automatically.

### Streaming responses use the SSE helper

Never write SSE plumbing manually. Use `services.sse.createStream(res)`:

```javascript
const stream = services.sse.createStream(res);
stream.send('progress', { percent: 50 });
stream.done({ result });
// Auto-handles heartbeat, headers, close
```

### Permission checks use RBAC

```javascript
const requireAdmin = services.rbac.require(services.PERMISSIONS.ADMIN_AUDIT_LOG);
router.get('/admin/stuff', requireAuth, requireAdmin, wrap(async (req, res) => { ... }));
```

### Audit sensitive actions

For anything security-sensitive (login, deploy, secret access, admin action):

```javascript
services.audit.log({
  user_id: req.user.id,
  event_type: 'deploy.triggered',
  severity: 'info',
  ip: req.ip,
  resource: req.path,
  metadata: { target: 'github_repo' },
});
```

---

## Environment Variables

### Required
- `OPENAI_API_KEY` — Primary LLM
- `JWT_SECRET` — Auth
- `DATABASE_PATH` — SQLite location (defaults to `./data.db`)

### Optional (recommended for production)
- `ANTHROPIC_API_KEY` — Claude (better reasoning routing)
- `DEEPSEEK_API_KEY` — Cheaper coding tasks
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — Distributed cache
- `REDIS_URL` — BullMQ queues (otherwise in-process fallback)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_ELITE`
- `SENTRY_DSN` — Error tracking
- `POSTHOG_API_KEY` — Product analytics
- `RESEND_API_KEY`, `EMAIL_FROM` — Transactional email
- `TAVILY_API_KEY` — Web search for knowledge service
- `ADMIN_EMAILS` — Comma-separated list of admin email addresses
- `LOG_LEVEL` — `debug` | `info` | `warn` | `error`

---

## How to Run Locally

```bash
cd backend
npm install
cp .env.example .env  # fill in OPENAI_API_KEY at minimum
node server.js
```

Frontend is served as static files. Open `http://localhost:3001` in browser.

---

## How to Deploy

The platform deploys to:
- **Backend**: Railway (`railway.json` config)
- **Frontend**: Vercel (`vercel.json` config)
- **Domain**: nexusaitools.co (Namecheap → Cloudflare DNS)

```bash
git push origin main  # triggers Railway + Vercel auto-deploy
```

---

## Security Boundaries

1. **Never log secrets** — environment variables, API keys, JWT tokens.
2. **All sensitive actions are audited** — see `security/audit.js` for `EVENT_TYPES`.
3. **Admin endpoints require RBAC** — `services.rbac.require(PERMISSION)`.
4. **External AI calls go through circuit breakers** — never call providers directly.
5. **User input must be sanitized** — use `services.security.sanitizeInput(input)`.
6. **Rate limits enforced at multiple layers** — middleware + RBAC + cost budgets.

---

## Performance Targets

- AI call cache hit rate: > 30%
- p95 API response time: < 500ms (excluding AI calls)
- p95 AI call duration: < 8s
- WebSocket reconnect time: < 2s
- Memory usage: < 512MB per instance

---

## Observability

- **Logs**: Pino → console (dev) / JSON (prod). Recent errors in DB.
- **Traces**: `services.tracer` → `/api/system/traces/:id` for replay.
- **Events**: `services.events` → `/api/system/events/recent`.
- **Metrics**: `services.metrics.snapshot()` → `/api/intelligence/metrics`.
- **Health**: `/api/core/health` (public), `/api/security/health/full` (admin).
- **Audit**: `/api/security/audit` (admin), `/api/security/audit/me` (user).

---

## Testing

> Comprehensive test suite is on the roadmap. For now, integration tests live in tracker scripts and manual verification.

**Smoke test** before every deploy:
1. `node --check **/*.js` — syntax check (CI runs this)
2. Start server locally — verify "Production stack ready" log
3. Hit `/api/core/health` — must return `status: healthy`
4. Run `/api/intelligence/multi-model` test — verify multi-provider works
5. Trigger deploy via `/api/deploy/deploy/full` — verify SSE streams

---

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Using `console.log` in production code | Use `services.logger` instead |
| Calling OpenAI directly | Use `services.smartCall` |
| Manual SSE setup | Use `services.sse.createStream(res)` |
| Mutating shared state | Pass through event bus instead |
| Skipping RBAC on admin endpoints | Always wrap with `services.rbac.require()` |
| Forgetting to audit sensitive ops | Use `services.audit.log()` |
| Long-running work in HTTP handler | Use `services.queues` (BullMQ) instead |
| Hardcoding model names | Use task hints (`task: 'coding-strong'`), let router decide |

---

## Contribution Checklist

Before pushing any change:

- [ ] Syntax check passes (`node --check`)
- [ ] No `console.log` in production code (use `services.logger`)
- [ ] No direct provider API calls (use `services.smartCall`)
- [ ] New endpoints have rate limiting + RBAC where appropriate
- [ ] Sensitive actions are audited
- [ ] No new top-level dependencies without discussion
- [ ] No business logic added to `routes/` (push to `services/`)
- [ ] Updated this doc if you added a new service