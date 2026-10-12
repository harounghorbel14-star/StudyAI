# Universal Agent — repository audit (baseline)

Audit of `main` at `a65571b` (PR #5 merged), on branch `claude/universal-agent`,
**before any change in this phase**. "Verified" means the code path was read and,
where noted, exercised. Anything else is labelled as a hypothesis.

## 1. Baseline test results

All commands run from the repository root with Node 22 (CI uses Node 20; Railway
uses Node 18.20.8).

| Command | Result |
|---|---|
| `npx tsc --noEmit` | pass |
| `node --check` on all 121 JS files in backend/, scripts/, tests/, frontend/ | 0 failures |
| `node tests/units.js` | 477/477 |
| `node tests/integration-mock.js` | 79 passed, 0 failed |
| `node tests/security-phase1.js` | 61 checks |
| `node tests/schema.js` | 97 tables, no conflicts |
| `node tests/research.js` | 34/34 |
| `node tests/agent.js` | 43/43 |
| `node tests/auth.js` | 64/64 |
| `node tests/inference.js` | 13/13 |
| `node tests/agent-api.js` | 25/25 |
| `node tests/e2e-auth.js` (Chromium) | 31/31 |
| `node tests/e2e-agent.js` (Chromium) | 13/13 |
| `node tests/e2e-deploy.js` (Chromium, Vercel emulator) | 19/19 |
| `npm audit --omit=dev --audit-level=high` | 0 vulnerabilities |

**There are no pre-existing failures.** Any failure after this point is a regression from this phase.

## 2. Verified existing capabilities

| Capability | Source | Verified behaviour |
|---|---|---|
| Server entry | `backend/server.js` | Express app; services wired by `backend/services/index.js`; agent runtime mounted at `/api/agent` (`routes/agent.js`). |
| Agent loop | `backend/agent/runner.js` | recall → plan → sequential steps → evaluate → retry/replan → synthesize → deterministic citation verification → lesson proposal. State is persisted in `agent_runs`, `agent_run_steps` and `agent_run_events`. |
| Tool registry | `backend/agent/tools.js` | Schemas, risk classes (`read` / `workspace` / `external`), timeouts, guest flags and audit events. `external` requires an approval fingerprint (tool + canonical args). |
| Tools | `backend/agent/default-tools.js` | `web_research`, `fetch_page`, `calculate` (no eval), `recall_memory`, `write_note`, `http_post` (external). No code execution. |
| Research | `backend/research/{engine,fetcher,search-providers}.js` | Multi-provider search, SSRF-safe fetch through `security/safe-http.js` (DNS check, re-checked on each redirect), robots.txt, verbatim-quote claims, contradiction detection, citation stripping. |
| Model routing | `backend/router/model-router.js`, `services/index.js` (`smartCall`), `services/TypeScript/local-llm.ts` | Candidate fallback with attempt records, no registry mutation, and `INFERENCE_MODE` hybrid / local-only / cloud. In local-only mode the shared OpenAI client points at the local server (`server.js`). |
| Memory | `backend/agent/memory.js` | Proposed / approved / rejected lessons, injection and duplicate checks, user-scoped evidence and episodes. |
| Auth / guests | `security/{sessions,guest}.js` | DB-checked sessions, revocation, guest allow-list, and per-plan agent budgets in `runner.js`. |
| UI | `frontend/agent-panel.js` | Plan, steps, sources, approvals, verification, lesson review and activity log (polling). |

## 3. Confirmed gaps and bugs (with evidence)

1. **Approval replay inside a run (security).** `runner.js` keeps approvals as a run-wide set of fingerprints and `tools.prepare` only checks `approvals.has(fp)`. Reproduced: one approval authorized two identical `http_post` calls. Approvals also have no expiry, are not single-use, and are not bound to a step.
2. **No state-transition guard.** `_execute` sets `status='running'` unconditionally and `_update` writes any status, so a stale `start()` could revive a finished run. `decide()` and `cancel()` check the current status, but the executor does not.
3. **Plans are sanitized, not validated.** `_sanitizeSteps` silently drops unknown tools and truncates extra steps. Arguments are validated only at execution time. There are no dependencies, cycle checks, per-step risk, estimates or overall success criteria.
4. **No deadline on model calls.** The cloud OpenAI client uses library defaults (`server.js:66`: 10 min timeout, 2 retries). The run deadline is checked only between calls, so a hung provider stalls a run past its time budget.
5. **Hybrid cloud fallback is silent and unconditional.** `smartCall` falls back to the cloud when the local model fails, and a run cannot require local-only handling for its content. The fallback is not recorded in run events.
6. **No restart recovery.** `AgentRunner.initSchema` fails every queued or running run. Nothing distinguishes a safely resumable run from one with an external action in flight (outcome unknown).
7. **No graceful shutdown.** There is no SIGTERM/SIGINT handler in `server.js`; in-flight runs are cut off.
8. **No readiness check.** `/health` returns a static `ok` and does not reflect the database or initialised services.
9. **Failure handling is coarse.** Failures are not classified. Retry is allowed only for `TIMEOUT`/`TOOL_ERROR` on read tools; the reason is not recorded for the replanner or the user.
10. **Steps run strictly sequentially,** even when independent (two research questions).
11. **Memory has no retention limits, no evidence deletion, and no measurement** of whether approved lessons change outcomes. Lesson retrieval ignores freshness.

## 4. Already meets the target (keep as is)

SSRF protection; tool registry as the only path to side effects; guest restrictions; owner-scoped
runs and lessons; verbatim-quote research verification; citation stripping; local-only isolation of
the OpenAI client; lessons require approval; no code execution; deterministic calculation.

## 5. Risks

- **Security:** approval replay (gap 1); revival of finished runs (gap 2).
- **Reliability:** hung provider calls (gap 4); restarts lose work (gap 6); abrupt shutdown (gap 7).
- **Privacy:** hybrid fallback may send local-intended content to the cloud without notice (gap 5).
- **Hypothesis, not verified here:** behaviour against real cloud and local providers. There are no credentials or GPU in this environment, so all tests use fake model and search servers.

## 6. Implementation order (smallest safe slices) and rollback

1. Step-bound, expiring, single-use approvals with idempotency checkpoints (gap 1).
2. Guarded state transitions (gap 2).
3. Schema-validated plans with dependencies, risk and estimates, one repair attempt, then the deterministic fallback (gap 3).
4. Failure classification and model-call deadlines (gaps 4, 9).
5. Inference privacy policy and visible fallback (gap 5).
6. Safe restart recovery, graceful shutdown and `/ready` (gaps 6–8).
7. Bounded parallel execution of independent read-only steps (gap 10).
8. Memory retention, evidence deletion, freshness and lesson-effect measurement (gap 11).
9. UI exposure, evaluation suite and documentation.

**Rollback:** every slice is additive. New tables (`agent_approvals`, `agent_lesson_uses`) and new columns are created with `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ADD COLUMN` and are ignored by older code, so reverting the commit restores the previous behaviour with no data migration. No production migration or deploy is part of this work.
