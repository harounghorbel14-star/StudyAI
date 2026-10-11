// ============================================================
// 🧠 router/model-router.js — Multi-Provider Model Router
// Routes by task type, cost, latency, quality
// Supports: OpenAI, Anthropic Claude, DeepSeek, Replicate
// ============================================================

const PROVIDERS = {
  openai:    { available: !!process.env.OPENAI_API_KEY },
  anthropic: { available: !!process.env.ANTHROPIC_API_KEY },
  deepseek:  { available: !!process.env.DEEPSEEK_API_KEY },
  replicate: { available: !!process.env.REPLICATE_API_KEY },
};

/**
 * Model registry — task profiles → preferred providers/models.
 * If a provider isn't available, falls back to next.
 */
const MODEL_REGISTRY = {
  // Reasoning & strategy
  'reasoning-deep': [
    { provider: 'anthropic', model: 'claude-sonnet-4-5',    cost: 3, quality: 10 },
    { provider: 'openai',    model: 'gpt-4o',               cost: 5, quality: 10 },
    { provider: 'deepseek',  model: 'deepseek-reasoner',    cost: 1, quality: 9 },
  ],
  'reasoning-fast': [
    { provider: 'openai',    model: 'gpt-4o-mini',          cost: 1, quality: 7 },
    { provider: 'anthropic', model: 'claude-haiku-4-5',     cost: 1, quality: 8 },
  ],

  // Coding
  'coding-strong': [
    { provider: 'anthropic', model: 'claude-sonnet-4-5',    cost: 3, quality: 10 },
    { provider: 'deepseek',  model: 'deepseek-coder',       cost: 0.5, quality: 9 },
    { provider: 'openai',    model: 'gpt-4o',               cost: 5, quality: 10 },
  ],
  'coding-fast': [
    { provider: 'deepseek',  model: 'deepseek-coder',       cost: 0.5, quality: 9 },
    { provider: 'openai',    model: 'gpt-4o-mini',          cost: 1, quality: 7 },
  ],

  // Creative writing & design
  'creative': [
    { provider: 'anthropic', model: 'claude-sonnet-4-5',    cost: 3, quality: 10 },
    { provider: 'openai',    model: 'gpt-4o',               cost: 5, quality: 10 },
  ],

  // Fast / cheap operations
  'extraction': [
    { provider: 'openai',    model: 'gpt-4o-mini',          cost: 1, quality: 8 },
  ],
  'classification': [
    { provider: 'openai',    model: 'gpt-4o-mini',          cost: 1, quality: 9 },
  ],
  'summarization': [
    { provider: 'anthropic', model: 'claude-haiku-4-5',     cost: 1, quality: 8 },
    { provider: 'openai',    model: 'gpt-4o-mini',          cost: 1, quality: 8 },
  ],

  // Embeddings
  'embedding': [
    { provider: 'openai',    model: 'text-embedding-3-small', cost: 0.1, quality: 9 },
  ],
};

const TASK_PATTERNS = [
  { patterns: ['debug', 'fix bug', 'investigate', 'troubleshoot', 'why does'],          task: 'reasoning-deep' },
  { patterns: ['code', 'function', 'class', 'implement', 'algorithm', 'refactor'],      task: 'coding-strong' },
  { patterns: ['quick', 'short', 'tldr', 'one line'],                                   task: 'summarization' },
  { patterns: ['summarize', 'summary', 'recap', 'overview'],                            task: 'summarization' },
  { patterns: ['extract', 'parse', 'find all', 'list the'],                             task: 'extraction' },
  { patterns: ['classify', 'categorize', 'is this', 'detect'],                          task: 'classification' },
  { patterns: ['write', 'story', 'creative', 'poem', 'compose', 'imagine'],             task: 'creative' },
  { patterns: ['plan', 'analyze', 'compare', 'evaluate', 'decide', 'strategy'],         task: 'reasoning-deep' },
];

/**
 * Detect task type from prompt.
 */
function detectTask(prompt, hint) {
  if (hint && MODEL_REGISTRY[hint]) return hint;
  const lower = String(prompt || '').toLowerCase();
  for (const { patterns, task } of TASK_PATTERNS) {
    if (patterns.some(p => lower.includes(p))) return task;
  }
  return lower.length < 200 ? 'reasoning-fast' : 'reasoning-deep';
}

/**
 * Thrown when no configured model can serve a request. The message names
 * the setting to change, so the caller can show it instead of a stack.
 */
class ModelUnavailableError extends Error {
  constructor(message, attempts = []) {
    super(message);
    this.name = 'ModelUnavailableError';
    this.code = 'MODEL_UNAVAILABLE';
    this.status = 503;
    this.attempts = attempts;
  }
}

const INFERENCE_MODES = ['hybrid', 'local-only', 'cloud'];

/**
 * INFERENCE_MODE:
 *   hybrid     (default) local model for its configured tasks, cloud otherwise
 *              and as fallback when the local server fails.
 *   local-only never sends a prompt to a cloud provider; if the local
 *              server is down the request fails with MODEL_UNAVAILABLE.
 *   cloud      never uses the local server.
 */
function inferenceMode(env = process.env) {
  const mode = String(env.INFERENCE_MODE || 'hybrid').trim().toLowerCase();
  return INFERENCE_MODES.includes(mode) ? mode : 'hybrid';
}

function availableCloudProviders() {
  return Object.keys(PROVIDERS).filter((p) => p !== 'replicate' && PROVIDERS[p].available);
}

/**
 * Ordered candidates for a task among providers that are configured.
 * Returns copies: callers may annotate them without touching the
 * shared registry.
 */
function candidatesFor(taskType, options = {}) {
  const candidates = (MODEL_REGISTRY[taskType] || MODEL_REGISTRY['reasoning-fast'])
    .filter((c) => PROVIDERS[c.provider]?.available)
    .map((c) => ({ ...c }));
  if (options.preferCheap) candidates.sort((a, b) => a.cost - b.cost);
  return candidates;
}

/**
 * Select best available model for task (a copy, never the registry entry).
 */
function selectModel(taskType, options = {}) {
  const [first] = candidatesFor(taskType, options);
  // Kept for callers that only want a label; execute() refuses to call
  // a provider that is not configured.
  return first || { provider: 'openai', model: 'gpt-4o-mini', cost: 1, quality: 7, unconfigured: true };
}

/**
 * Execute with the right provider, falling back through every other
 * configured candidate for the task.
 * Returns: { output, model, provider, task_type, duration_ms, usage, attempts }
 *
 * The previous version reassigned provider/model on the object returned
 * by selectModel — which was the MODEL_REGISTRY entry itself — so one
 * failed call permanently rewrote the registry for every later request.
 */
async function execute(clients, options) {
  const { prompt, system, task, max_tokens, temperature = 0.7, json = false, history = [] } = options;
  const taskType = detectTask(prompt, task);
  const candidates = candidatesFor(taskType, options);
  if (!candidates.length) {
    throw new ModelUnavailableError(
      'No cloud AI provider is configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY or DEEPSEEK_API_KEY, '
      + 'or run a local model (LOCAL_LLM_ENABLED=true, INFERENCE_MODE=local-only).',
    );
  }
  const startTime = Date.now();
  const retriesPerCandidate = Math.max(0, options.maxRetries ?? 0);
  const attempts = [];
  for (const choice of candidates) {
    for (let i = 0; i <= retriesPerCandidate; i++) {
      const t0 = Date.now();
      try {
        const result = await callProvider(clients, choice, { prompt, system, max_tokens, temperature, json, history });
        attempts.push({ provider: choice.provider, model: choice.model, ok: true, ms: Date.now() - t0 });
        return {
          output: result.output,
          provider: choice.provider,
          model: choice.model,
          task_type: taskType,
          duration_ms: Date.now() - startTime,
          usage: result.usage,
          attempt: attempts.length,
          attempts,
        };
      } catch (err) {
        attempts.push({ provider: choice.provider, model: choice.model, ok: false, ms: Date.now() - t0, error: String(err.message).slice(0, 200) });
        if (i < retriesPerCandidate) await new Promise((r) => setTimeout(r, 500 * (i + 1)));
      }
    }
  }
  const last = attempts[attempts.length - 1];
  const err = new Error(`All configured providers failed for ${taskType}: ${last?.error || 'unknown error'}`);
  err.code = 'PROVIDERS_FAILED';
  err.attempts = attempts;
  throw err;
}

async function callProvider(clients, choice, params) {
  const { provider, model } = choice;
  const messages = [];
  if (params.system) messages.push({ role: 'system', content: params.system });
  (params.history || []).slice(-10).forEach(m => messages.push({ role: m.role, content: m.content }));
  messages.push({ role: 'user', content: params.prompt });

  if (provider === 'openai') {
    if (!clients.openai) throw new Error('OpenAI client not available');
    const config = {
      model,
      max_tokens: params.max_tokens || 2000,
      temperature: params.temperature,
      messages,
    };
    if (params.json) config.response_format = { type: 'json_object' };
    const result = await clients.openai.chat.completions.create(config);
    let output = result.choices[0]?.message?.content || '';
    if (params.json) output = safeJsonParse(output);
    return { output, usage: result.usage };
  }

  if (provider === 'anthropic') {
    if (!clients.anthropic) throw new Error('Anthropic client not available');
    const result = await clients.anthropic.messages.create({
      model,
      max_tokens: params.max_tokens || 2000,
      system: params.system,
      messages: messages.filter(m => m.role !== 'system'),
    });
    let output = result.content?.[0]?.text || '';
    if (params.json) output = safeJsonParse(output);
    return { output, usage: result.usage };
  }

  if (provider === 'deepseek') {
    if (!process.env.DEEPSEEK_API_KEY) throw new Error('DeepSeek key missing');
    const r = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: params.max_tokens || 2000,
        temperature: params.temperature,
        response_format: params.json ? { type: 'json_object' } : undefined,
      }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(`DeepSeek: ${data.error?.message || r.statusText}`);
    let output = data.choices?.[0]?.message?.content || '';
    if (params.json) output = safeJsonParse(output);
    return { output, usage: data.usage };
  }

  throw new Error(`Unknown provider: ${provider}`);
}

function safeJsonParse(text) {
  try { return JSON.parse(text); }
  catch (_) {
    const cleaned = String(text).replace(/```json|```/g, '').trim();
    try { return JSON.parse(cleaned); }
    catch (_) { return { _raw: text, _parse_error: true }; }
  }
}

module.exports = {
  ModelUnavailableError,
  INFERENCE_MODES,
  inferenceMode,
  availableCloudProviders,
  candidatesFor,
  PROVIDERS,
  MODEL_REGISTRY,
  TASK_PATTERNS,
  detectTask,
  selectModel,
  execute,
  safeJsonParse,
};