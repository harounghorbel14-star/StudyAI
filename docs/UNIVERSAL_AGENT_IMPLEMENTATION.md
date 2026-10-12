# Universal Agent — implementation report

Builds on the audit in [UNIVERSAL_AGENT_AUDIT.md](UNIVERSAL_AGENT_AUDIT.md) and the
existing runtime described in [AGENT.md](AGENT.md). Branch: `claude/universal-agent`.
**Not merged and not deployed.**

## 1. Architecture and execution flow

```
POST /api/agent/runs {goal, budget?, privacy?}
  └─ AgentRunner.create         budget = plan limits, lowered (never raised) by the request
     └─ start → _transition(queued→running)          refused for finished/cancelled runs
        ├─ recall    approved lessons (relevance × freshness) + similar episodes
        ├─ PLAN      Planner → agent/plan.js validatePlan
        │            ✗ → plan.rejected event → one repair prompt listing the errors
        │            ✗ → deterministic fallback (web_research) — or stop if not even that fits the budget
        ├─ EXECUTE   loop until no open steps:
        │            • steps whose dependencies failed → skipped
        │            • ready read-only steps → up to AGENT_MAX_PARALLEL at once
        │            • workspace/external step → alone
        │              external: approval bound to (user, run, step, tool, fingerprint),
        │              unexpired and unused → consumed atomically → checkpoint → call
        │            • EVALUATE deterministic first (citations, calculation), then Validator
        │            • failure → agent/policy.js classifyFailure
        │                transient + read → one retry; budget/permission → stop;
        │                otherwise REPLAN (validated against the remaining budget)
        ├─ SYNTHESIZE Analyst, observations only, [E#] citations
        ├─ VERIFY    deterministic checks → level: verified | partially_verified |
        │            executed_unverified | failed; unknown [E#] removed
        └─ record evidence, lesson outcomes; PROPOSE lesson; _transition(running→terminal)
```

Every model call goes through `llm()` in the runner. That function checks the budget and cancellation, applies a per-call deadline (`AGENT_MODEL_TIMEOUT_MS`), and records provider, model, tokens (when the provider reports them) and any fallback as a `model.call` event.

## 2. Reused vs new

| Area | Reused | New in this phase |
|---|---|---|
| Tool system | `agent/tools.js` registry, schemas, risk classes, audit | Approvals consumed per step through `agent_approvals`; checkpoint before external calls |
| Planning | Planner prompt, fallback plan | `agent/plan.js`: whole-plan validation (tools, args, `depends_on`, cycles, steps/tool/model budget), risk from the registry, estimates, one repair attempt |
| Lifecycle | `agent_runs` / `agent_run_steps` / `agent_run_events` | `agent/policy.js` transition table, enforced with conditional `UPDATE`s; `outcome_unknown` step state |
| Failures | Read-only-only retry | Failure classes (transient, invalid_arguments, permission_denied, provider_unavailable, budget_exhausted, verification_failed, non_retryable); replanner receives the class |
| Execution | Sequential loop | Dependencies and bounded parallelism for independent read-only steps |
| Inference | `smartCall`, `INFERENCE_MODE`, local-only client | Per-run `privacy: "local"`; `INFERENCE_CLOUD_FALLBACK=deny`; `routing` metadata (fallback, attempts) surfaced in events and `usage.fallbacks`; per-call deadlines |
| Memory | Proposed/approved lessons, evidence, episodes | Retention limits, freshness weighting, evidence list/delete, `agent_lesson_uses` evaluation records, `/lessons/effectiveness` |
| Operations | `/health` | `/ready` and `/api/ready`; SIGTERM/SIGINT drain; restart recovery (resume read-only runs; never repeat unknown external outcomes) |
| Research | Whole engine unchanged | — |
| UI | `frontend/agent-panel.js` | Success criteria, assumptions, progress, step risk and dependencies, failure class, retries, fallbacks, verification level, approval scope and expiry, privacy option |

**Specialist agents.** Planner, Researcher (`web_research`), Validator, Analyst and Reviewer remain roles inside one bounded loop, sharing one registry, one budget and one cancellation signal. Independent research steps now run concurrently. A separate multi-agent framework was not added, because nothing measured in this phase showed it would add value over this.

## 3. Configuration

| Variable | Default | Meaning |
|---|---|---|
| `AGENT_APPROVAL_TTL_MS` | 1800000 (30 min) | How long an approval request, and a granted approval, stays valid |
| `AGENT_MODEL_TIMEOUT_MS` | 60000 | Deadline per model call (never beyond the run's deadline) |
| `AGENT_MAX_PARALLEL` | 2 (max 4) | Concurrent independent read-only steps |
| `AGENT_RESUME_ON_RESTART` | true | Resume read-only runs after a restart (`false` fails them) |
| `AGENT_SHUTDOWN_GRACE_MS` | 10000 | Drain time for active runs on SIGTERM |
| `AGENT_MAX_LESSONS_PER_USER` / `AGENT_MAX_EVIDENCE_PER_USER` | 200 / 2000 | Retention limits (oldest removed first; approved lessons kept preferentially) |
| `INFERENCE_CLOUD_FALLBACK` | allow | `deny`: in hybrid mode, tasks assigned to the local model never go to the cloud, even when the local model is failing or marked unhealthy |

Local model setup, `INFERENCE_MODE` and search providers are unchanged; see [AGENT.md](AGENT.md).
No new npm dependencies were added.

## 4. API and event contract changes (all backward compatible)

- `POST /api/agent/runs` accepts optional `privacy: "default" | "local"`; any other value is a 400.
- `POST /api/agent/runs/:id/decision` accepts optional `step_id`. A mismatch returns **409 `STALE_APPROVAL`**. An expired request returns **409 `APPROVAL_EXPIRED`** and is re-issued for review.
- `POST /api/agent/runs` while the server is draining returns **503 `SHUTTING_DOWN`**.
- New endpoints: `GET /api/agent/lessons/effectiveness`, `GET /api/agent/evidence`, `DELETE /api/agent/evidence/:id`, `GET /ready`, `GET /api/ready`. Guests cannot reach the agent memory endpoints (server allow-list).
- Additions to existing responses:
  - run: `options`;
  - step: `risk`, `depends_on`, `expected_output`, `failure`;
  - plan: `success_criteria`, `assumptions`, `estimates`, `source`, `rejected_attempts`;
  - result: `verification.level`, `not_attempted`;
  - usage: `retries`, `fallbacks`;
  - pending action: `requested_at`, `expires_at`.
- New events: `plan.rejected`, `steps.parallel`, `step.skipped`, `approval.consumed`, `approval.expired`, `run.recovered`, `run.interrupted`, `state.transition_refused`. `model.call` also carries `routing`, `code` and `tokens`.
- New step state: `outcome_unknown`.

**Behaviour changes:**
- A plan with an unknown tool or invalid arguments is now rejected as a whole and repaired, instead of having those steps silently dropped.
- A run interrupted by a restart is resumed when it was doing read-only work, instead of always being failed.

## 5. Security boundaries

- The **tool registry is the only path to side effects.** No shell, no unrestricted filesystem access, no eval, no code execution.
- **External actions:**
  - server-side approval bound to the user, run, step, tool and argument fingerprint;
  - the fingerprint is re-derived from the stored step when approving, so a tampered pending action is refused;
  - each approval is single-use and expires;
  - changed arguments require a new approval;
  - external actions are never retried, and never repeated after a crash with an unknown outcome.
- **Lifecycle:** state changes are conditional `UPDATE`s, so stale `start`, `decide` and `cancel` calls cannot revive or resume a finished run.
- **Data isolation:** every run, event, approval, lesson, evidence and effectiveness query is scoped to the user; another user's run looks like a missing one (404).
- **Privacy:**
  - `local-only` mode and a `privacy: "local"` run never call a cloud provider;
  - with `deny`, hybrid mode never falls back to the cloud for local tasks.
  - All three are verified with a fake cloud server that receives zero requests.
- **Unchanged:** SSRF protection, prompt-injection fencing, verbatim-quote evidence and citation stripping.

## 6. Tests executed (this branch, Node 22, local)

| Command | Result |
|---|---|
| `npx tsc --noEmit` / `npx tsc` | pass / pass |
| `node --check` (126 files) | 0 failures |
| `node tests/units.js` | 477/477 |
| `node tests/integration-mock.js` | 79/79 |
| `node tests/security-phase1.js` | 61 |
| `node tests/schema.js` | 99 tables, no conflicts |
| `node tests/research.js` | 34/34 |
| `node tests/agent.js` | 47/47 (updated for whole-plan rejection and safe recovery; see §4) |
| `node tests/agent-hardening.js` (new) | 57/57 |
| `node tests/agent-eval.js` (new) | 9/9 scenarios, average 7.4 model calls per run |
| `node tests/auth.js` | 64/64 |
| `node tests/inference.js` | 13/13 |
| `node tests/agent-api.js` | 25/25 |
| `node tests/agent-ops.js` (new, real server: `/ready`, SIGTERM drain and recovery, privacy routing) | 16/16 |
| `node tests/e2e-auth.js` / `e2e-agent.js` / `e2e-deploy.js` (Chromium) | 31/31 · 18/18 · 19/19 |
| `npm audit --omit=dev` (root, backend) | 0 / 0 vulnerabilities |
| Railway simulation (backend only, Node 18.20.8, no compiler) | install, build and start OK; `/health` and `/ready` 200; SIGTERM exits cleanly |

**Two real bugs were found by the new tests and fixed:**
- A cancel landing during synthesis could leave a run stuck in `cancelling`.
- `INFERENCE_CLOUD_FALLBACK=deny` was bypassed once the local model was marked unhealthy.

**All tests use fake models and search (labelled "mocked").** Not run here, because there are no credentials or GPU in this environment:
- live tests against OpenAI, Anthropic, DeepSeek, Ollama or vLLM;
- live web search.

Live smoke test, after deploy:
```
GET  /ready                                  → 200, checks.inference.can_serve
POST /api/agent/runs {goal:"What is 6*7?"}   → run reaches "succeeded", calculate → 42
POST /api/agent/runs {goal, privacy:"local"} → with no local model: fails with MODEL_UNAVAILABLE, no cloud usage in provider dashboards
```

## 7. Known limitations

- **Abandoned model calls keep running.** A timed-out call is abandoned by the runner, but the underlying HTTP request is not cancelled (`smartCall` has no abort signal). Its tokens may still be billed.
- **Resumed runs restart their time budget,** and a step interrupted mid-way is re-run from the start (read-only steps only).
- **Lesson effectiveness is observational,** not a randomised A/B test. Fewer than five runs is labelled `too_small`.
- **The cost of a step is not tracked per step.** Model cost is tracked by the existing `cost` service per call.
- **Still not implemented:** JavaScript-rendered pages, code execution (needs an isolated sandbox), and model training.

## 8. Deployment checklist and rollback

**Deployment checklist:**
1. Review and merge the PR (CI must be green).
2. Railway redeploys from `main`. There is no migration step: new tables and columns are created at boot with `IF NOT EXISTS` / `ADD COLUMN`.
3. Optional configuration: `INFERENCE_CLOUD_FALLBACK=deny` if hybrid mode must keep local content local.
4. Point the Railway health check at `/health`, or at `/ready` to also gate on the database and services.
5. Run the live smoke test (§6).

**Rollback:** revert the merge commit and redeploy.
- The new tables (`agent_approvals`, `agent_lesson_uses`) and columns are ignored by the previous code.
- Runs left `queued` by recovery are failed by the previous code's startup routine.
- No data has to be migrated back.
