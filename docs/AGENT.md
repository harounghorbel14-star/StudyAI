# NexusAI agent runtime

> Phase 2 hardening (approvals, state machine, validated plans, recovery, privacy routing, memory controls) is documented in [UNIVERSAL_AGENT_IMPLEMENTATION.md](UNIVERSAL_AGENT_IMPLEMENTATION.md).

What the agent can actually do, how it is kept safe, and how to configure it.
For the tests that back each claim, see the end of this file.

## Architecture

### Before

| Area | State |
| --- | --- |
| "Autonomous" mode (`/api/os/autonomous/full`) | Simulated. GPT-4o was asked to "execute the action" and then to grade itself. No tool ran. The client set the iteration and time limits (now clamped to 5 and 120 s). |
| Research (`/api/search`, `knowledge.groundedAnswer`) | One Tavily call. 300-character snippets were summarized by a model. No pages were read and no claims were checked. |
| Tools | About 150 prompt templates. None could act. |
| Memory | Four overlapping stores (`memory.js`, `memory-fabric.js`, `long_term_memory`, `ai-twin`). No provenance and no review. |
| Model router | A failed call overwrote the shared registry entry. There was no local-only guarantee. |

### After

```
Goal ──► AgentRunner (backend/agent/runner.js)
          │ recall: approved lessons + similar past runs (AgentMemory)
          │ PLAN      Planner model → steps using registered tools only
          │ for each step:
          │   ToolRegistry.prepare  schema · guest rules · approval gate
          │   ToolRegistry.execute  timeout · audit event · retry (read-only)
          │   EVALUATE              deterministic checks → Validator model
          │   on failure            REPLAN (bounded)
          │ SYNTHESIZE  Analyst model, observations only, cites [E#]
          │ VERIFY      every citation must resolve to retrieved evidence
          └ record episode · store evidence · PROPOSE a lesson (not used until approved)

web_research tool ──► ResearchEngine (backend/research/engine.js)
          plan queries → Tavily / Brave / SearXNG / Wikipedia
          → dedupe + rank (relevance, credibility, primary source, freshness, diversity)
          → PageFetcher (SSRF-safe, robots.txt, per-host rate limit, cache)
          → claims with verbatim quotes, checked against the page text
          → coverage check → follow-up round if thin
          → contradictions (numeric + model) → cited answer, gaps, confidence

All model calls ──► smartCall → INFERENCE_MODE (hybrid | local-only | cloud)
          → local server (Ollama / vLLM) or cloud providers with fallback
```

Every run is stored in `agent_runs`, `agent_run_steps` and `agent_run_events`.
The UI (rail → **Agent**) shows the plan, each step's status, the sources, any
pending approvals, the verification checks, the result with linked citations,
and the activity log.

## Safety model

| Concern | Control |
| --- | --- |
| Acting on the outside world | Tools are classed `read`, `workspace` or `external`. An `external` tool (currently `http_post`) never runs without an approval for that exact tool and those exact arguments. The run pauses as `awaiting_approval` and shows the action. An approval does not carry over to different arguments. External and workspace actions are never retried automatically. |
| Unknown or invented tools | A plan step naming an unregistered tool is dropped and never executed. |
| Prompt injection in web pages | Page text reaches the model only inside `<source>` / `<tool_output>` blocks that the text cannot close, with instructions to treat it as data. Pages that address the AI are flagged and ranked down, and quotes containing injection text are rejected. Even if a manipulated plan asks for an external action, it still needs approval. |
| Hallucinated sources | A claim counts only if its quote appears verbatim in the fetched page. Citations to sources that were not retrieved are stripped and reported. |
| SSRF | All fetching goes through `security/safe-http.js`: public addresses only, re-checked on every redirect, 2 MB cap. |
| Site policies | Requests use a descriptive user agent, obey robots.txt, and are rate-limited per host. CAPTCHA, login and paywall pages are reported as blocked and never bypassed. |
| Cost and abuse | Each run costs one quota unit. Server-side budgets per plan cover steps, tool calls, model calls, replans and wall-clock time. Clients can lower them but not raise them. Active runs are capped per user. |
| Tenant isolation | Every run, event, lesson and evidence query is scoped to the requesting user. Another user's run returns 404. |
| Memory poisoning | The agent can only **propose** lessons. A lesson is used only after the user approves it. Lessons are length-limited, refused if they read like injected instructions, de-duplicated, and given to the planner as advisory notes. |
| Guests | Read-only tools, smaller budgets, one active run, and no lesson memory. Enforced on the server. |
| Restarts | Runs interrupted by a restart are marked `failed` (not left "running"). |

Nothing in this system trains or fine-tunes a model. "Learning" means stored,
reviewed lessons and episodic records that are retrieved into later runs.

## Configuration

### Models

| Variable | Meaning |
| --- | --- |
| `INFERENCE_MODE` | `hybrid` (default): the local model handles its configured tasks, the cloud handles the rest and is the fallback. `local-only`: no prompt is sent to any cloud provider; if the local server is down, requests fail. `cloud`: the local server is never used. |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `DEEPSEEK_API_KEY` | Cloud providers. Not required when `INFERENCE_MODE=local-only`. |
| `LOCAL_LLM_ENABLED=true`, `LOCAL_LLM_URL`, `LOCAL_LLM_BACKEND` (`ollama` / `openai-compatible`), `LOCAL_LLM_MODEL` | Local server. |

`GET /api/inference/status` reports what can serve requests right now and
whether prompts leave the server.

In `local-only` mode the server's single OpenAI client is pointed at the local
server's OpenAI-compatible `/v1` API. That covers the roughly 70 older routes
that call it directly, so none of them can reach api.openai.com. Image, speech
and other non-chat endpoints have no local equivalent and fail with an error.

**Realistic local setup (Ollama):**

```
# A machine with ≥16 GB RAM for 7–8B models (≥8 GB VRAM recommended);
# 70B-class models need ≥48 GB VRAM or heavy quantization.
ollama pull llama3.1:8b        # ≈4.7 GB download
ollama serve                   # http://localhost:11434

INFERENCE_MODE=local-only
LOCAL_LLM_ENABLED=true
LOCAL_LLM_URL=http://<ollama-host>:11434
LOCAL_LLM_MODEL=llama3.1:8b
```

Nothing is downloaded automatically. A Railway container has no GPU. Run the
model server on your own hardware or a GPU host and point `LOCAL_LLM_URL` at
it. Smaller local models follow the JSON planning format less reliably; the
runner then falls back to a deterministic research plan and extractive
answers, and says so.

**Local inference is not web access.** Research still needs a search provider
(below), and web pages are fetched from the internet.

### Research

| Variable | Provider |
| --- | --- |
| `TAVILY_API_KEY` | Tavily search API |
| `BRAVE_SEARCH_API_KEY` | Brave Search API |
| `SEARXNG_URL` | Your own SearXNG instance (JSON output enabled) |
| *(none)* | Wikipedia API, on by default; `RESEARCH_WIKIPEDIA=off` disables it |
| `RESEARCH_CACHE_TTL_HOURS` (6), `RESEARCH_HOST_INTERVAL_MS` (1000) | Cache lifetime and per-host politeness |

The engine does not scrape search-engine result pages and does not claim to
have searched "the whole internet". It stops when evidence from at least two
independent domains covers the question, when a round adds no new domains, or
when the page, time, round or model-call budget runs out. The answer states
which of these happened.

## Not implemented (and why)

- **Code execution.** Node's `vm` is not a security boundary. Running generated
  code safely needs a separate sandbox (gVisor, Firecracker or a container per
  run) with no network and no secrets. Until one exists, no code-execution tool
  is registered.
- **JavaScript-rendered pages.** The fetcher reads server-rendered HTML. A
  headless browser would need per-request SSRF interception and a resource
  budget; it is not enabled. Pages with no readable server-rendered text are
  reported as `no_readable_content`.
- **Parallel specialist agents.** Planner, Validator, Analyst and Reviewer are
  roles inside one bounded loop, not independently spawning agents. Steps run
  sequentially; independent research steps could be parallelised later within
  the same budgets.
- **Model training.** None. Lessons and evidence are retrieval-time context.

## Tests

| Suite | What it proves |
| --- | --- |
| `tests/research.js` (34 checks) | On a fictional fixture web: multi-round research, dedupe, provider failure, verbatim-quote verification, injection handling, contradiction detection, citations that resolve, budgets, cancellation, time limit, no-model and failing-model modes, robots.txt, CAPTCHA, cache, SSRF. |
| `tests/agent.js` (43) | Real runner, registry, memory and engine: bounded multi-step task, dropped unknown tools, verification, observability, usage tracking, proposed vs approved lessons, isolation, replan after an SSRF-refused step, approval/rejection of external actions, guest limits, budgets, cancellation, model outage, restart safety. |
| `tests/agent-api.js` (25) | Same over HTTP against the real server: lifecycle, SSE, ownership 404s, lesson review, validation, budget clamping, guests. |
| `tests/inference.js` (13) | Router fallback, registry integrity, local-only end to end: the fake cloud server receives zero requests, even when the local server is down. |
| `tests/e2e-agent.js` (13) | Chromium: the panel runs a goal, shows plan, verification and result, keeps model HTML inert, approves a lesson, and rejects an external action. |

All CI tests use deterministic fakes for models and search. Live-web and
live-model behaviour has not been tested in CI, because CI has no provider
credentials.
