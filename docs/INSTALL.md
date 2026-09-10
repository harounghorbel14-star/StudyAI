# NexusAI — Installation Guide

Every file, where it goes, and how to verify it worked.

**104 files · 16 TypeScript modules · 522 tests**

---

## Before you start

### 1. Back up what you have

```bat
cd D:\Downloads
xcopy studyai studyai-backup-%DATE:~-4%%DATE:~3,2%%DATE:~0,2% /E /I /Y
```

If anything goes wrong you can restore from this folder. Do not skip it —
this installation deletes files.

### 2. Know what changed

| | Before | After |
|---|---|---|
| Sidebar | 44 flat buttons | 6 primary areas |
| UI panels | 17 defined, **0 reachable** | 17 reachable |
| Shells | 2 (one dead) | 1 |
| TypeScript | 0 modules | 16 modules, strict |
| Tests | 79 | 522 |
| Duplicate endpoints | ~35 silent | 9 tagged and measured |

---

## Step 1 — Create the new folders

```bat
cd D:\Downloads\studyai\studyai

mkdir types
mkdir scripts
mkdir prisma
mkdir tests\e2e
mkdir .github\workflows
```

`mkdir` fails harmlessly if a folder already exists.

---

## Step 2 — Delete superseded files

These were replaced. Leaving them causes real problems: the module
resolver would find both a `.js` and its compiled `.ts` replacement.

### 2a. Converted to TypeScript

The `.ts` source compiles to `dist/`, so the old `.js` must go.

```bat
del services\contracts.js
del services\event-bus.js
del services\logger.js
del services\ai-twin.js
del services\predictive-execution.js
del services\temporal-ux.js
del services\local-llm.js
del services\semantic-cache.js
del security\rbac.js
del security\validation.js
del security\hardening.js
del monitoring\observability.js
```

### 2b. Orphaned — imported by nothing

```bat
del monitoring\tracing.js
```

Verified: zero importers. `services/tracer.js` is the tracer that is
actually wired.

### 2c. Merged into other files

```bat
del realtime\websocket.js
del design-system.js
del cinematic.js
del visual-components.js
del ui-panels.js
```

`websocket.js` now lives inside `server.js`; the four frontend modules
live inside `app.js`.

### 2d. If these exist, delete them too

Earlier drafts that were replaced:

```bat
del services\projects.js
del services\orchestration.js
del services\deprecation.js
del FILE-PLACEMENT-GUIDE.md
```

---

## Step 3 — Place the files

### ROOT — `D:\Downloads\studyai\studyai\`

**25 files.** The four marked ⭐ are the ones you will edit most.

| File | Lines | What it is |
|---|---:|---|
| ⭐ `server.js` | 4,653 | Express backend, 320+ endpoints, WebSocket |
| ⭐ `app.js` | 9,531 | Frontend: 17 panels, design system, orchestration UI |
| ⭐ `nexus-shell.js` | 732 | **New.** The 6-area navigation shell |
| ⭐ `index.html` | 397 | Entry point |
| `package.json` | 56 | 15 scripts, 21 deps, 5 devDeps |
| `tsconfig.json` | 53 | Strict mode, outputs to `dist/` |
| `.gitignore` | 13 | Excludes `dist/`, `node_modules/`, `.env` |
| `style.css` | 1,982 | Base UI |
| `design-system.css` | 465 | Design tokens, 20 layers |
| `cinematic.css` | 301 | Holographic surfaces, deep work mode |
| `logo.svg` | 41 | Orbital identity |
| `manifest.json` | 53 | PWA manifest |
| `sw.js` | 78 | Service worker |
| `tool-engine.js` | 295 | Tool execution |
| `tools.config.js` | 1,119 | 180+ tool catalog |
| `playwright.config.js` | 30 | E2E config, 5 profiles |
| `share.html` | 297 | Share/embed page |
| `design-preview.html` | 232 | Design system demo (standalone) |
| `sitemap.xml` | 9 | SEO |
| `.env.example` | 25 | Environment template |
| `INSTALL.md` | 456 | This guide |
| `README.md` | 305 | Project readme |
| `ENGINEERING.md` | 283 | Architecture rules |
| `TYPESCRIPT-MIGRATION.md` | 131 | Migration status, 16/38 done |
| `PRODUCT-AUDIT.md` | 266 | Audit findings |

---

### `types\` — 2 files

| File | Lines | Notes |
|---|---:|---|
| `core.ts` | 151 | Shared types. Every `.ts` module imports from here |
| `ambient.d.ts` | 80 | Node stubs. Delete once `@types/node` is installed |

---

### `services\` — 39 files

**TypeScript (11)** — compile to `dist/services/`:

| File | Lines | What it does |
|---|---:|---|
| `contracts.ts` | 325 | Schemas, factories, cycle detection |
| `event-bus.ts` | 225 | Pub/sub. Handler contract fixed here |
| `logger.ts` | 166 | Structured logging with level filtering |
| `projects.ts` | 540 | Project Workspace, approvals, autonomy |
| `orchestration.ts` | 403 | Intent routing, 6 pipelines |
| `deprecation.ts` | 249 | Duplicate tracking |
| `ai-twin.ts` | 320 | Behaviour patterns, predictions |
| `predictive-execution.ts` | 275 | Pre-computed responses |
| `temporal-ux.ts` | 223 | Time-adaptive configuration |
| `local-llm.ts` | 491 | Ollama / vLLM, off by default |
| `semantic-cache.ts` | 219 | Prompt-similarity cache |

**Infrastructure (2):**

| File | Lines | Notes |
|---|---:|---|
| ⭐ `index.js` | 577 | Composition root. Wires all 40 services |
| ⭐ `_resolve.js` | 61 | Loads compiled `.ts` when present, `.js` otherwise |

**JavaScript (26):**

`adaptive.js` (162) · `backup.js` (155) · `business-ops.js` (286) ·
`cache.js` (175) · `community.js` (257) · `compound-intelligence.js` (307) ·
`cost-optimizer.js` (153) · `db-adapter.js` (104) · `disaster-recovery.js` (147) ·
`dreamspace.js` (280) · `embeddings.js` (247) · `health-monitor.js` (134) ·
`knowledge.js` (201) · `media-pipeline.js` (208) · `memory.js` (236) ·
`memory-fabric.js` (189) · `notifications.js` (274) · `orchestrator.js` (224) ·
`payments.js` (369) · `pmf-analytics.js` (231) · `reality-map.js` (271) ·
`repo-intelligence.js` (280) · `shadow-mode.js` (233) · `tracer.js` (176) ·
`voice.js` (146) · `workspaces.js` (276)

---

### `security\` — 7 files

| File | Lines | Type | Notes |
|---|---:|---|---|
| `rbac.ts` | 244 | TS | Fail-closed on unknown roles |
| `validation.ts` | 399 | TS | Schema validation, types inferred |
| `hardening.ts` | 478 | TS | CSRF, tiered limits, CSP |
| `audit.js` | 191 | JS | Tamper-evident chain |
| `middleware.js` | 211 | JS | Helmet, rate limits, sanitize |
| `protection.js` | 242 | JS | Bot and abuse detection |
| `secret-rotation.js` | 191 | JS | AES-256-GCM vault |

---

### `monitoring\` — 2 files

| File | Lines | Type |
|---|---:|---|
| `observability.ts` | 384 | TS — Sentry + PostHog with secret scrubbing |
| `metrics.js` | 145 | JS — counters and histograms |

`tracing.js` is **not** in this list. It was an orphan and is deleted.

---

### `routes\` — 13 files

| File | Lines | Mounted at |
|---|---:|---|
| `agents-system.js` | 757 | `/api/agents` |
| `ai-os-core.js` | 601 | `/api/os` |
| `deploy-engine.js` | 421 | `/api/deploy` |
| `core-system.js` | 364 | `/api/core` |
| `ux-saas.js` | 325 | `/api/ux` |
| `files.js` | 306 | `/api/docs` |
| `mega-agent.js` | 282 | `/api/mega` |
| `payments-and-agents.js` | 273 | `/api/billing` (deprecated) |
| `devtools.js` | 257 | `/api/dev` |
| `intelligence.js` | 225 | `/api/intelligence` |
| `security.js` | 167 | `/api/security` |
| `admin.js` | 163 | `/api/admin` |
| `system.js` | 105 | `/api/system` |

---

### Single-file folders — 7 files

| Path | Lines | What it does |
|---|---:|---|
| `agents\registry.js` | 203 | 15 specialised agents |
| `router\model-router.js` | 230 | Provider routing |
| `queues\queue.js` | 163 | BullMQ with in-process fallback |
| `workers\index.js` | 76 | Background jobs |
| `resilience\circuit-breaker.js` | 128 | Per-provider breakers |
| `prisma\schema.prisma` | 276 | PostgreSQL schema, 13 models |
| `.github\workflows\ci.yml` | 109 | 5 CI jobs |

---

### `realtime\` — 2 files

| File | Lines |
|---|---:|
| `sse.js` | 131 |
| `events.js` | 94 |

`websocket.js` is gone — it now lives inside `server.js`.

---

### `tests\` — 5 files

| File | Lines | Runs |
|---|---:|---|
| `unit.js` | 1,425 | 443 tests, 18 suites |
| `integration-mock.js` | 615 | 79 tests, mock DB |
| `load.js` | 277 | Load harness, 5 profiles |
| `integration.js` | 166 | Real DB |
| `e2e\smoke.spec.js` | 87 | 9 Playwright tests |

---

### `scripts\` — 2 files

| File | Lines |
|---|---:|
| `deploy.js` | 108 |
| `migrate-to-postgres.js` | 120 |

---

## Step 4 — Install and build

```bat
cd D:\Downloads\studyai\studyai

npm install
npm install -D typescript @types/node

npm run build
```

`npm run build` must run **before** anything else. It compiles the 16
TypeScript modules into `dist/`, and `services/_resolve.js` loads from
there. Without it the app falls back to `.js` files you just deleted.

Expected output: `dist/` containing **16 `.js` + 16 `.d.ts`**.

---

## Step 5 — Verify

Run these in order. Each must pass before the next.

```bat
npm run typecheck
```
Expected: no output. Any error is a real type error, not a warning.

```bat
npm run test:unit
```
Expected: `443/443 unit tests passed`

```bat
npm test
```
Expected: build, then `443/443`, then `79 passed, 0 failed`

```bat
npm run dev
```
Expected: server starts on port 3001. Look for these lines:

```
✅ Services initialized
🪦 Deprecation tracking active on 9 paths
✅ Realtime WebSocket service attached at /ws
💀 NexusAI running on port 3001
```

---

## Step 6 — Check it in a browser

Open `http://localhost:3001` **with the DevTools Console open**.

### What should happen

1. A vertical rail on the left with 6 icons: Home, Projects, Build, Run, Grow, Knowledge
2. Home shows a large input: *"What do you want to build or accomplish?"*
3. Clicking an area opens a drawer of sub-items

### Keyboard shortcuts

| Keys | Effect |
|---|---|
| `Ctrl+Shift+D` | Deep work mode |
| `Ctrl+Shift+M` | Cycle operational mode |
| `Esc` | Close the current panel |

### What may fail

**The 17 panels have never executed in a browser.** They were defined
but never called until this release, so this is their first run. The
shell catches errors per panel and shows them instead of crashing, but
expect some to fail.

Click through each area and note anything that shows an error card.
The Console will name the panel and the exact failure.

---

## Environment variables

Copy `.env.example` to `.env` and fill in what applies.

**Required:**

```
OPENAI_API_KEY=sk-...
JWT_SECRET=<a long random string>
```

**Admin access** — note that casing no longer matters:

```
ADMIN_EMAILS=you@example.com
```

**Optional providers:**

```
ANTHROPIC_API_KEY=
DEEPSEEK_API_KEY=
TAVILY_API_KEY=
REPLICATE_API_KEY=
ELEVENLABS_API_KEY=
```

**Payments** — checkout stays disabled without these:

```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_PRO=
STRIPE_PRICE_ELITE=
STRIPE_PRICE_TEAM=
```

**Monitoring** — both degrade silently when absent:

```
SENTRY_DSN=
POSTHOG_API_KEY=
```

**Local LLM** — off unless explicitly enabled:

```
LOCAL_LLM_ENABLED=false
LOCAL_LLM_URL=http://localhost:11434
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Cannot resolve module "services/..."` | Build not run | `npm run build` |
| `Cannot find module 'ws'` | Missing dep | `npm install ws` |
| `Cannot find type definition for 'node'` | Missing types | `npm install -D @types/node` |
| 403 on admin routes as an admin | `ADMIN_EMAILS` not set | Add your email to `.env`, restart |
| Sidebar looks unchanged | `nexus-shell.js` not loaded | Check the `<script>` tag in `index.html` |
| A panel shows an error card | First browser execution | Read the Console, report the panel name |
| `npm test` fails on a deleted file | Old `.js` still present | Re-run Step 2 |

---

## A note on RBAC

Authorization is now **fail-closed**. Before, an unknown role name made
the comparison `level < undefined`, which is always false — so
`requireRole('administrator')` (a typo for `'admin'`) granted access to
everyone, including guests.

Unknown roles and permissions now deny.

**If a route that used to work returns 403 after this update, that route
was misspelled and silently open.** Check the Console for
`RBAC configured with an unknown role`.

---

## After installation

The highest-value thing you can do next is not more code:

```bat
npm run test:load -- --profile=baseline
```

This is the only way to learn what the system actually handles under
concurrency. Until it runs, capacity is unknown.