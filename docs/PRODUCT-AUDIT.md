# NexusAI — Product Architecture Audit & Restructure Plan

*Evidence-based. Every finding verified against the codebase, not inferred.*

---

## 1. Current Architecture Assessment

### What is genuinely strong

| Layer | Assessment |
|---|---|
| Composition root | Single `services/index.js` wires 37 services cleanly. Better than most teams manage. |
| Resilience | Circuit breakers per provider, fallbacks, semantic cache, graceful degradation throughout. |
| Security | 108/110 routes authenticated, tamper-evident audit chain, fail-closed RBAC, AES-256 vault. |
| Provider independence | 6 providers + local LLM path. This is a real moat. |
| Type safety | 14 modules strict TS, CI blocks on type errors. |
| Testing | 302 tests, 214 of them real unit tests. |

### What is structurally broken

**The backend has been built three times.** Not metaphorically — literally three parallel implementations of the same subsystems, all mounted simultaneously.

| Subsystem | Implementations | Locations |
|---|---|---|
| **Stripe webhook** | **3** | `/api/stripe/webhook` · `/api/payments/webhook` · `/api/billing/webhook` |
| **Payments** | **2 complete** | `routes/payments-and-agents.js` (`/api/billing/*`) · `server.js` inline (`/api/payments/*`) |
| **Backups** | **3** | `/api/admin/backups` · `/api/security/backups` · `/api/dr/backups` |
| **Cost tracking** | **3** | `/api/admin/cost/*` · `/api/security/cost/*` · `/api/cost/*` |
| **Audit log** | **2** | `/api/admin/audit/*` · `/api/security/audit/*` |
| **Health checks** | **4** | `/api/admin/health/*` · `/api/security/health/full` · `/api/core/health` · `/api/dr/health` |
| **Memory** | **2** | `/api/os/memory/*` · `/api/intelligence/memory/*` |
| **Orchestration** | **2** | `/api/core/orchestrate` · `/api/agents/orchestrate` |
| **Cache stats** | **2** | `/api/core/cache/stats` · `/api/os/cache/stats` |
| **IP blocking** | **2** | `/api/admin/security/block` · `/api/security/threats/block-ip` |

### The critical bug

Only **one** of the three Stripe webhooks has idempotency protection (`services/payments.js`, via the `payment_events` table). The other two will reprocess a replayed event.

**And the frontend calls `/api/billing/*` — the old system without idempotency — 7 times.** The hardened payment service built later is not wired to the UI at all.

If Stripe is configured against more than one of these URLs, subscriptions get double-provisioned.

### Dead code

| File | Imports |
|---|---|
| `monitoring/tracing.js` (171 lines) | **0** |
| `services/db-adapter.js` (104 lines) | **0** — the Postgres path is unreachable |

### Orphan API surface

15 namespaces exist in the backend and are never called by the UI: `/api/analytics` `/api/credits` `/api/embeddings` `/api/local-llm` `/api/memory` `/api/observability` `/api/portal` `/api/secrets` `/api/sessions` `/api/stripe` `/api/stt` `/api/tools` `/api/tradeoff` `/api/webhooks`.

Several of these are the *newest and best* work — embeddings, local-llm, observability — built but never surfaced.

**Assessment: 8.5/10 engineering, 4/10 architectural coherence.** The parts are excellent; they were assembled by accretion rather than design.

---

## 2. Product Positioning Assessment

### Current implicit positioning
> "An AI Operating System with 316 endpoints, 17 panels, 15 agents, and 7 advanced AI systems."

This is a **capability inventory**, not a positioning. It answers *what NexusAI contains*, never *what it does for me*.

### Why this fails commercially

Horizontal AI tooling is the category with the highest failure rate in the market. Products that describe themselves by breadth compete against foundation-model vendors who ship the same breadth for free.

Meanwhile the things NexusAI does that are genuinely scarce — provider independence, cost transparency, audit trails, local execution — are buried in orphan endpoints with no UI.

### The gap

| What NexusAI is | What it says it is |
|---|---|
| The AI stack that doesn't lock you in | "An AI OS that does everything" |
| Full cost and provider transparency | (not mentioned) |
| Idea → deployed business pipeline | (implied, never stated) |

**The single highest-leverage change in this project requires no code: the sentence used to describe it.**

---

## 3. Biggest UX Problems

| # | Problem | Evidence |
|---|---|---|
| 1 | **No entry point.** 17 sibling tabs, none primary. | `NXUI.renderAllExtended()` renders 17 equal tabs |
| 2 | **Architecture leaks into the UI.** "Twin", "Fabric", "Temporal", "Shadow", "Dreamspace" are internal system names shown as menu items. | Panels 10–17 |
| 3 | **No unit of work.** Every action is one-shot. Nothing accumulates into a project. | No project entity in the UI layer |
| 4 | **The best feature is hidden.** `/api/core/one-prompt` — the "describe it and it happens" endpoint — has no UI. | Orphan endpoint |
| 5 | **Agents exposed as a picker.** The user is asked to choose among 15 specialists they cannot evaluate. | `/api/intelligence/agent-pick` exists but UI shows raw list |
| 6 | **Empty-state death spiral.** Marketplace and Seasons render "0 items" to every new user. | `community.js` panels |
| 7 | **No autonomy contract.** Nothing tells the user what the AI will do without asking. | No approval model anywhere |
| 8 | **Duplicate surfaces.** Cost appears in 3 places, backups in 3, health in 4. | See §1 |

---

## 4. Recommended Information Architecture

```
┌─────────────────────────────────────────────────────┐
│  HOME — "What do you want to build?"                │
│  One input. One prompt. Creates a Project.          │
└─────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│  PROJECT WORKSPACE                                  │
│  Goal · Plan · Agents · Tasks · Files · Code        │
│  Activity · Deployments · Analytics · Memory        │
└─────────────────────────────────────────────────────┘

PRIMARY NAV (5)
├── Home       one-prompt · recent projects · resume
├── Build      code · media · voice · devtools · agents · scaffolding
├── Run        deployments · logs · health · infrastructure · cost
├── Grow       business · PMF · marketing · experiments · community
└── Knowledge  files · RAG · memory · web research · embeddings

SETTINGS (secondary)
└── account · billing · providers · autonomy · admin · security
```

### The invisibility rule

| System | Old (menu item) | New (behaviour) |
|---|---|---|
| AI Twin | 🧠 Twin panel | Home suggestions reflect your patterns |
| Memory Fabric | 🕸️ Fabric panel | Projects remember context automatically |
| Temporal UX | ⏰ Temporal panel | Interface adapts to time of day silently |
| Predictive | 🔮 Predictive panel | Answers appear instantly |
| Shadow Mode | 👤 Shadow panel | Inline suggestion cards inside projects |
| Dreamspace | 💤 Dreamspace panel | "While you were away…" on Home |
| Reality Map | 🗺️ RealityMap panel | *Is* the Home dashboard |

All seven remain fully functional. None remains a navigation item. A **Systems** view under Settings exposes them for users who want the detail.

---

## 5. Endpoint → Product Area Mapping

| Area | Namespaces | Endpoints | Primary services |
|---|---|---|---|
| **HOME** | `/api/core/one-prompt` `/api/reality-map` `/api/dreamspace` `/api/temporal` `/api/twin` `/api/predictive` | ~18 | reality-map · dreamspace · ai-twin · temporal-ux · predictive-execution |
| **BUILD** | `/api/mega` `/api/dev` `/api/repo` `/api/media` `/api/voice` `/api/agents` `/api/intelligence` `/api/core/orchestrate` | ~110 | repo-intelligence · media-pipeline · voice · orchestrator · compound-intelligence · agents |
| **RUN** | `/api/deploy` `/api/dr` `/api/system` `/api/cost` `/api/local-llm` `/api/observability` | ~45 | disaster-recovery · cost-optimizer · local-llm · observability · tracer · health-monitor |
| **GROW** | `/api/business` `/api/pmf` `/api/community` `/api/ux/ab-tests` `/api/ux/analytics` | ~45 | business-ops · pmf-analytics · community |
| **KNOWLEDGE** | `/api/docs` `/api/kb` `/api/embeddings` `/api/fabric` `/api/intelligence/memory` | ~40 | knowledge · embeddings · memory-fabric · memory |
| **TEAM** *(cross-cutting)* | `/api/workspaces` `/api/teams` WebSocket | ~12 | workspaces · realtime |
| **SETTINGS** | `/api/payments` `/api/notifications` `/api/security` `/api/admin` `/api/secrets` `/api/shadow/prefs` | ~46 | payments · notifications · rbac · audit · secret-rotation |

---

## 6. What to Keep — untouched

- All 37 services
- All 15 agents
- All 6 providers + local LLM
- The composition root and its wiring
- Security, RBAC, audit chain, secrets vault
- Test suites (302 tests) and CI
- The TypeScript migration in progress
- The design system and cinematic layer

---

## 7. What to Merge

| Merge | Into | Reason |
|---|---|---|
| `/api/billing/*` + `/api/stripe/webhook` | `/api/payments/*` | Only this one has webhook idempotency |
| `/api/admin/backups` + `/api/security/backups` | `/api/dr/*` | DR has verification and restore-testing |
| `/api/admin/cost` + `/api/security/cost` | `/api/cost/*` | Single cost surface |
| `/api/admin/audit` | `/api/security/audit` | Security version has chain verification |
| `/api/admin/health` + `/api/security/health` + `/api/core/health` | `/api/dr/health` | Most complete implementation |
| `/api/os/memory` | `/api/intelligence/memory` | Superset, includes graph |
| `/api/os/cache/stats` | `/api/core/cache/stats` | Identical |
| `/api/agents/orchestrate` | `/api/core/orchestrate` | Same engine |

Old paths remain as **307 redirects for one release**, then are removed. No client breaks.

---

## 8. What to Hide

Not deleted — moved out of primary navigation.

| Surface | New location |
|---|---|
| Twin · Fabric · Temporal · Shadow · Dreamspace · Predictive | Settings → Systems (read-only detail) |
| Marketplace · Seasons · Reputation | Grow → Community, **gated until 25 active users** |
| PMF dashboard | Settings → Admin |
| Admin (7 tabs) | Settings → Admin |
| Local LLM | Settings → Providers |
| Secrets | Settings → Security |
| Embeddings · Observability | Settings → Systems |

---

## 9. What to Deprecate

| Item | Evidence | Action |
|---|---|---|
| `monitoring/tracing.js` | 0 imports | Delete |
| `services/db-adapter.js` | 0 imports — Postgres path unreachable | Wire it, or delete and use Prisma |
| `/api/stripe/webhook` | Superseded, no idempotency | Redirect → remove |
| `/api/billing/*` | Duplicate payment system | Redirect → remove |
| Duplicate backup/cost/audit/health routes | See §7 | Redirect → remove |
| `FILE-PLACEMENT-GUIDE.md` | Predates the TS migration | Delete |

---

## 10. What NOT to Touch

- `services/index.js` composition order — subtle initialisation dependencies
- The audit hash chain — altering it invalidates history
- Webhook signature verification
- RBAC fail-closed logic — recently fixed, security-critical
- Circuit breaker thresholds — tuned against real provider behaviour
- The TS migration shim (`services/_resolve.js`)
- Anything with passing test coverage, unless the test is updated in the same change

---

## 11. Implementation Plan

### Phase A — Safety *(this turn)*
1. Collapse three Stripe webhooks into one with idempotency
2. Point the frontend at the hardened payment service
3. Delete verified dead code

### Phase B — Product shell *(this turn)*
4. New primary navigation: Home · Build · Run · Grow · Knowledge
5. Home screen with one-prompt as the primary interaction
6. Project workspace model
7. Advanced systems moved behind Settings → Systems

### Phase C — Consolidation *(next)*
8. Route merges with 307 redirects
9. Community gated until 25 active users
10. Autonomy/approval model

### Phase D — Polish *(next)*
11. Transparency page (provider · cost · cache · limits)
12. Agent orchestration progress UI

---

## 12. Risks & Regressions to Watch

| Risk | Severity | Mitigation |
|---|---|---|
| Webhook consolidation breaks live subscriptions | 🔴 High | Keep old paths as redirects; verify Stripe dashboard URL before removal |
| Frontend switch from `/api/billing` → `/api/payments` | 🔴 High | Response shapes differ — map explicitly, test checkout end-to-end |
| Hiding panels breaks deep links | 🟠 Medium | Keep routes resolvable; redirect to new location |
| `db-adapter` deletion removes the Postgres path | 🟠 Medium | Decide first: wire it or commit to Prisma |
| Users who relied on a hidden panel | 🟡 Low | Settings → Systems keeps everything reachable |
| Test suite drift during navigation rewrite | 🟡 Low | Run all five suites after every step |

---

*Phases A and B are implemented in this change. Phases C and D are scoped and ready.*# NexusAI — Product Architecture Audit & Restructure Plan

*Evidence-based. Every finding verified against the codebase, not inferred.*

---

## 1. Current Architecture Assessment

### What is genuinely strong

| Layer | Assessment |
|---|---|
| Composition root | Single `services/index.js` wires 37 services cleanly. Better than most teams manage. |
| Resilience | Circuit breakers per provider, fallbacks, semantic cache, graceful degradation throughout. |
| Security | 108/110 routes authenticated, tamper-evident audit chain, fail-closed RBAC, AES-256 vault. |
| Provider independence | 6 providers + local LLM path. This is a real moat. |
| Type safety | 14 modules strict TS, CI blocks on type errors. |
| Testing | 302 tests, 214 of them real unit tests. |

### What is structurally broken

**The backend has been built three times.** Not metaphorically — literally three parallel implementations of the same subsystems, all mounted simultaneously.

| Subsystem | Implementations | Locations |
|---|---|---|
| **Stripe webhook** | **3** | `/api/stripe/webhook` · `/api/payments/webhook` · `/api/billing/webhook` |
| **Payments** | **2 complete** | `routes/payments-and-agents.js` (`/api/billing/*`) · `server.js` inline (`/api/payments/*`) |
| **Backups** | **3** | `/api/admin/backups` · `/api/security/backups` · `/api/dr/backups` |
| **Cost tracking** | **3** | `/api/admin/cost/*` · `/api/security/cost/*` · `/api/cost/*` |
| **Audit log** | **2** | `/api/admin/audit/*` · `/api/security/audit/*` |
| **Health checks** | **4** | `/api/admin/health/*` · `/api/security/health/full` · `/api/core/health` · `/api/dr/health` |
| **Memory** | **2** | `/api/os/memory/*` · `/api/intelligence/memory/*` |
| **Orchestration** | **2** | `/api/core/orchestrate` · `/api/agents/orchestrate` |
| **Cache stats** | **2** | `/api/core/cache/stats` · `/api/os/cache/stats` |
| **IP blocking** | **2** | `/api/admin/security/block` · `/api/security/threats/block-ip` |

### The critical bug

Only **one** of the three Stripe webhooks has idempotency protection (`services/payments.js`, via the `payment_events` table). The other two will reprocess a replayed event.

**And the frontend calls `/api/billing/*` — the old system without idempotency — 7 times.** The hardened payment service built later is not wired to the UI at all.

If Stripe is configured against more than one of these URLs, subscriptions get double-provisioned.

### Dead code

| File | Imports |
|---|---|
| `monitoring/tracing.js` (171 lines) | **0** |
| `services/db-adapter.js` (104 lines) | **0** — the Postgres path is unreachable |

### Orphan API surface

15 namespaces exist in the backend and are never called by the UI: `/api/analytics` `/api/credits` `/api/embeddings` `/api/local-llm` `/api/memory` `/api/observability` `/api/portal` `/api/secrets` `/api/sessions` `/api/stripe` `/api/stt` `/api/tools` `/api/tradeoff` `/api/webhooks`.

Several of these are the *newest and best* work — embeddings, local-llm, observability — built but never surfaced.

**Assessment: 8.5/10 engineering, 4/10 architectural coherence.** The parts are excellent; they were assembled by accretion rather than design.

---

## 2. Product Positioning Assessment

### Current implicit positioning
> "An AI Operating System with 316 endpoints, 17 panels, 15 agents, and 7 advanced AI systems."

This is a **capability inventory**, not a positioning. It answers *what NexusAI contains*, never *what it does for me*.

### Why this fails commercially

Horizontal AI tooling is the category with the highest failure rate in the market. Products that describe themselves by breadth compete against foundation-model vendors who ship the same breadth for free.

Meanwhile the things NexusAI does that are genuinely scarce — provider independence, cost transparency, audit trails, local execution — are buried in orphan endpoints with no UI.

### The gap

| What NexusAI is | What it says it is |
|---|---|
| The AI stack that doesn't lock you in | "An AI OS that does everything" |
| Full cost and provider transparency | (not mentioned) |
| Idea → deployed business pipeline | (implied, never stated) |

**The single highest-leverage change in this project requires no code: the sentence used to describe it.**

---

## 3. Biggest UX Problems

| # | Problem | Evidence |
|---|---|---|
| 1 | **No entry point.** 17 sibling tabs, none primary. | `NXUI.renderAllExtended()` renders 17 equal tabs |
| 2 | **Architecture leaks into the UI.** "Twin", "Fabric", "Temporal", "Shadow", "Dreamspace" are internal system names shown as menu items. | Panels 10–17 |
| 3 | **No unit of work.** Every action is one-shot. Nothing accumulates into a project. | No project entity in the UI layer |
| 4 | **The best feature is hidden.** `/api/core/one-prompt` — the "describe it and it happens" endpoint — has no UI. | Orphan endpoint |
| 5 | **Agents exposed as a picker.** The user is asked to choose among 15 specialists they cannot evaluate. | `/api/intelligence/agent-pick` exists but UI shows raw list |
| 6 | **Empty-state death spiral.** Marketplace and Seasons render "0 items" to every new user. | `community.js` panels |
| 7 | **No autonomy contract.** Nothing tells the user what the AI will do without asking. | No approval model anywhere |
| 8 | **Duplicate surfaces.** Cost appears in 3 places, backups in 3, health in 4. | See §1 |

---

## 4. Recommended Information Architecture

```
┌─────────────────────────────────────────────────────┐
│  HOME — "What do you want to build?"                │
│  One input. One prompt. Creates a Project.          │
└─────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│  PROJECT WORKSPACE                                  │
│  Goal · Plan · Agents · Tasks · Files · Code        │
│  Activity · Deployments · Analytics · Memory        │
└─────────────────────────────────────────────────────┘

PRIMARY NAV (5)
├── Home       one-prompt · recent projects · resume
├── Build      code · media · voice · devtools · agents · scaffolding
├── Run        deployments · logs · health · infrastructure · cost
├── Grow       business · PMF · marketing · experiments · community
└── Knowledge  files · RAG · memory · web research · embeddings

SETTINGS (secondary)
└── account · billing · providers · autonomy · admin · security
```

### The invisibility rule

| System | Old (menu item) | New (behaviour) |
|---|---|---|
| AI Twin | 🧠 Twin panel | Home suggestions reflect your patterns |
| Memory Fabric | 🕸️ Fabric panel | Projects remember context automatically |
| Temporal UX | ⏰ Temporal panel | Interface adapts to time of day silently |
| Predictive | 🔮 Predictive panel | Answers appear instantly |
| Shadow Mode | 👤 Shadow panel | Inline suggestion cards inside projects |
| Dreamspace | 💤 Dreamspace panel | "While you were away…" on Home |
| Reality Map | 🗺️ RealityMap panel | *Is* the Home dashboard |

All seven remain fully functional. None remains a navigation item. A **Systems** view under Settings exposes them for users who want the detail.

---

## 5. Endpoint → Product Area Mapping

| Area | Namespaces | Endpoints | Primary services |
|---|---|---|---|
| **HOME** | `/api/core/one-prompt` `/api/reality-map` `/api/dreamspace` `/api/temporal` `/api/twin` `/api/predictive` | ~18 | reality-map · dreamspace · ai-twin · temporal-ux · predictive-execution |
| **BUILD** | `/api/mega` `/api/dev` `/api/repo` `/api/media` `/api/voice` `/api/agents` `/api/intelligence` `/api/core/orchestrate` | ~110 | repo-intelligence · media-pipeline · voice · orchestrator · compound-intelligence · agents |
| **RUN** | `/api/deploy` `/api/dr` `/api/system` `/api/cost` `/api/local-llm` `/api/observability` | ~45 | disaster-recovery · cost-optimizer · local-llm · observability · tracer · health-monitor |
| **GROW** | `/api/business` `/api/pmf` `/api/community` `/api/ux/ab-tests` `/api/ux/analytics` | ~45 | business-ops · pmf-analytics · community |
| **KNOWLEDGE** | `/api/docs` `/api/kb` `/api/embeddings` `/api/fabric` `/api/intelligence/memory` | ~40 | knowledge · embeddings · memory-fabric · memory |
| **TEAM** *(cross-cutting)* | `/api/workspaces` `/api/teams` WebSocket | ~12 | workspaces · realtime |
| **SETTINGS** | `/api/payments` `/api/notifications` `/api/security` `/api/admin` `/api/secrets` `/api/shadow/prefs` | ~46 | payments · notifications · rbac · audit · secret-rotation |

---

## 6. What to Keep — untouched

- All 37 services
- All 15 agents
- All 6 providers + local LLM
- The composition root and its wiring
- Security, RBAC, audit chain, secrets vault
- Test suites (302 tests) and CI
- The TypeScript migration in progress
- The design system and cinematic layer

---

## 7. What to Merge

| Merge | Into | Reason |
|---|---|---|
| `/api/billing/*` + `/api/stripe/webhook` | `/api/payments/*` | Only this one has webhook idempotency |
| `/api/admin/backups` + `/api/security/backups` | `/api/dr/*` | DR has verification and restore-testing |
| `/api/admin/cost` + `/api/security/cost` | `/api/cost/*` | Single cost surface |
| `/api/admin/audit` | `/api/security/audit` | Security version has chain verification |
| `/api/admin/health` + `/api/security/health` + `/api/core/health` | `/api/dr/health` | Most complete implementation |
| `/api/os/memory` | `/api/intelligence/memory` | Superset, includes graph |
| `/api/os/cache/stats` | `/api/core/cache/stats` | Identical |
| `/api/agents/orchestrate` | `/api/core/orchestrate` | Same engine |

Old paths remain as **307 redirects for one release**, then are removed. No client breaks.

---

## 8. What to Hide

Not deleted — moved out of primary navigation.

| Surface | New location |
|---|---|
| Twin · Fabric · Temporal · Shadow · Dreamspace · Predictive | Settings → Systems (read-only detail) |
| Marketplace · Seasons · Reputation | Grow → Community, **gated until 25 active users** |
| PMF dashboard | Settings → Admin |
| Admin (7 tabs) | Settings → Admin |
| Local LLM | Settings → Providers |
| Secrets | Settings → Security |
| Embeddings · Observability | Settings → Systems |

---

## 9. What to Deprecate

| Item | Evidence | Action |
|---|---|---|
| `monitoring/tracing.js` | 0 imports | Delete |
| `services/db-adapter.js` | 0 imports — Postgres path unreachable | Wire it, or delete and use Prisma |
| `/api/stripe/webhook` | Superseded, no idempotency | Redirect → remove |
| `/api/billing/*` | Duplicate payment system | Redirect → remove |
| Duplicate backup/cost/audit/health routes | See §7 | Redirect → remove |
| `FILE-PLACEMENT-GUIDE.md` | Predates the TS migration | Delete |

---

## 10. What NOT to Touch

- `services/index.js` composition order — subtle initialisation dependencies
- The audit hash chain — altering it invalidates history
- Webhook signature verification
- RBAC fail-closed logic — recently fixed, security-critical
- Circuit breaker thresholds — tuned against real provider behaviour
- The TS migration shim (`services/_resolve.js`)
- Anything with passing test coverage, unless the test is updated in the same change

---

## 11. Implementation Plan

### Phase A — Safety *(this turn)*
1. Collapse three Stripe webhooks into one with idempotency
2. Point the frontend at the hardened payment service
3. Delete verified dead code

### Phase B — Product shell *(this turn)*
4. New primary navigation: Home · Build · Run · Grow · Knowledge
5. Home screen with one-prompt as the primary interaction
6. Project workspace model
7. Advanced systems moved behind Settings → Systems

### Phase C — Consolidation *(next)*
8. Route merges with 307 redirects
9. Community gated until 25 active users
10. Autonomy/approval model

### Phase D — Polish *(next)*
11. Transparency page (provider · cost · cache · limits)
12. Agent orchestration progress UI

---

## 12. Risks & Regressions to Watch

| Risk | Severity | Mitigation |
|---|---|---|
| Webhook consolidation breaks live subscriptions | 🔴 High | Keep old paths as redirects; verify Stripe dashboard URL before removal |
| Frontend switch from `/api/billing` → `/api/payments` | 🔴 High | Response shapes differ — map explicitly, test checkout end-to-end |
| Hiding panels breaks deep links | 🟠 Medium | Keep routes resolvable; redirect to new location |
| `db-adapter` deletion removes the Postgres path | 🟠 Medium | Decide first: wire it or commit to Prisma |
| Users who relied on a hidden panel | 🟡 Low | Settings → Systems keeps everything reachable |
| Test suite drift during navigation rewrite | 🟡 Low | Run all five suites after every step |

---

*Phases A and B are implemented in this change. Phases C and D are scoped and ready.*