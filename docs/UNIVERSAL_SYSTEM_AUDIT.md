# Universal Intelligence System: audit and gap report (after PR #6)

Baseline: `main` at `4e84dbb` (PR #6 merged). Branch for this work: `claude/pensive-clarke-ioa8la`.
Before any change, every suite passed. Status: all checks green, not merged, not deployed.

## 1. What exists

### The real agent runtime (`backend/agent/*`, `backend/research/*`)

This is the only part of the codebase that **executes** actions:
- tool registry with risk classes;
- validated plans, run state machine and approvals;
- verified research and memory.

It is mounted at `/api/agent/runs*` and used by the Agent panel (`frontend/agent-panel.js`).

### Five other "agent" systems — prompt-only

They were found by inventory, and none of them runs a tool. Each step is a model prompt that returns text.

| System | Routes | What it really does | Tests |
|---|---|---|---|
| `services/TypeScript/orchestration.ts` | `/api/orchestrate/plan`, `/run`, `/resume/:id` | Keyword and model intent → fixed pipeline of registry prompts, streamed over SSE. Has an approval gate in front of a devops prompt; nothing is deployed. | units.js (keyword intents, persistence) |
| `services/orchestrator.js` DAG + `routes/core-system.js` | `/api/core/one-prompt` | Model classification → planner, designer, developer and finalizer prompts. The developer node writes guidance text only. | none |
| `agents/registry.js` + `routes/intelligence.js` | `/api/intelligence/agent/:key`, `/agent-pick`, `/execute` | One prompt per role; regex role picker | 1 existence check |
| `routes/agents-system.js` | `/api/agents/orchestrate`, `/autonomous`, … | A 6-role gpt-4o chain. `/autonomous` asks the model to "execute this action and return the result" — **simulated**. | none |
| `routes/ai-os-core.js` | `/api/os/autonomous/full` | Same simulation; capped at 5 iterations in an earlier phase | none |
| Built into `server.js` | `/api/agent/run`, `/api/agent` | Chained gpt-4o prompts per role | none |

Additional coding endpoints are also prompt-only:
- `/api/mega/code/*`;
- `/api/repo/analyze`, `/review`, `/debug` (model analysis of pasted code);
- `/api/billing/qa-agent`, `/security-agent`.

**Dead route:** `frontend/app.js` calls `/api/mega/code/pair`, but no handler exists.

### Model routing (`router/model-router.js`, `services/index.js` `smartCall`)

- Task types: reasoning-deep, reasoning-fast, coding-strong, coding-fast, creative, extraction, classification, summarization, embedding.
- How a task type is chosen: an explicit hint, else keyword patterns, else prompt length.
- `INFERENCE_MODE` (hybrid, local-only, cloud), per-run privacy, and `INFERENCE_CLOUD_FALLBACK=deny` were added in PR #6.

### Intent classifiers (four, all independent)

- `server.js detectIntent`: analytics only.
- The orchestration service's keyword + model classifier.
- The one-prompt model classifier.
- `pickAgent` (regex).

None of them fronts the real agent runtime.

## 2. Confirmed issues

Each was reproduced before it was fixed. Where a test is named, it fails on the pre-fix code and passes after.

| # | Issue | Evidence | Fix |
|---|---|---|---|
| 1 | **Approval decisions were not bound to a step.** `POST /api/agent/runs/:id/decision` accepted a missing `step_id`, and the runner then applied the decision to whatever step was pending, so a stale or replayed approve/reject could act on a later action. | With the old code, 13 new checks in `tests/agent-hardening.js` failed: an approval with no `step_id` went through and changed the run. | `step_id` is now required: format-checked at the API (400 `INVALID_STEP_ID`), required to match the pending step exactly in the runner (409 `STALE_APPROVAL`), and grant/reject plus the state transition happen in one transaction. Commit `4e97849`. |
| 2 | **`/api/agents/autonomous` had no iteration cap.** `max_iterations` came from the client; each iteration makes 2 gpt-4o calls for one quota unit. | A request for 1000 iterations made 1000 iterations (`tests/agent-api.js`, old code). | Clamped to 1..5; the loop stops when the client disconnects; `executed` events carry `simulated: true`. Commit `1d3f5f5`. |
| 3 | No orchestrator in front of the real runtime: no intent classification, specialists, delegation or independent review. | Inventory (§1) | Added in this branch (§3). |
| 4 | The real runtime had no coding capability, only prompt-only code endpoints. | Inventory (§1) | Read-only, admin-only repository tools plus diff proposals (§3). |
| 5 | Research results had no structured report or retrieval provenance. | `research/engine.js` citations had no retrieval time | Report built deterministically from tool output (§3). |

## 3. Decisions

- **Extend `AgentRunner`; do not add a sixth system.** Specialists are roles inside the runner. They reuse the `agents/registry.js` prompts and the existing registry, budget, approvals and state machine.
- **Delegation is a tool, not recursion.** `consult_specialist` is one model call with no tools. It cannot create steps, call tools or consult anyone else, so depth is 1 by construction.
- **Least privilege per specialist.** Enforced in plan validation and re-checked at execution. Only the orchestrator owns external actions, which stay approval-gated.
- **Coding tools are read-only.**
  - The repository is never written. `propose_edit` records a diff for review; applying it, running tests and opening a PR remain human (or CI) steps.
  - Running tests from the agent would need an isolated sandbox, which does not exist (see AGENT.md "Not implemented").
- **The legacy prompt-only systems stay.** Removing them would remove features the UI uses. The one with an unbounded cost was capped and labelled as simulated. Consolidating them onto the runtime is listed as future work.

## 4. Not changed, still open

Recorded rather than fixed in this branch:
- **`POST /api/orchestrate/plan` has no `requireQuota`** (`server.js:4430`). It can call the model when keyword confidence is low; only the global limiter applies.
- **`GET /api/intelligence/agents` and `GET /api/agents/share/:share_id` are public.**
  - The first lists static role metadata (`routes/intelligence.js:118`).
  - The second returns a project's idea and agent outputs to anyone holding the link (`routes/agents-system.js:345`).
  - `share_id` is 64 random bits (`crypto.randomBytes(8)`, `:242`), so the link is not guessable.
  - But the link is created for **every** project automatically, with no opt-in and no way to revoke it.
- **`/api/repo/*` has no quota** (`server.js:3531`; `requireAuth` and `aiLimiter` only).
- **The dead `/api/mega/code/pair` call** (`frontend/app.js:4786`).
- **The five prompt-only agent systems overlap.** Each one bypasses the runtime's budgets, approvals and verification.
