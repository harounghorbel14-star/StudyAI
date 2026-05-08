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
 * Select best available model for task.
 */
function selectModel(taskType, options = {}) {
  const candidates = MODEL_REGISTRY[taskType] || MODEL_REGISTRY['reasoning-fast'];
  const available = candidates.filter(c => PROVIDERS[c.provider]?.available);

  if (!available.length) {
    // Final fallback: OpenAI mini
    return { provider: 'openai', model: 'gpt-4o-mini', cost: 1, quality: 7 };
  }

  // Sort by quality if quality preferred, else cost
  if (options.preferCheap) {
    return available.sort((a, b) => a.cost - b.cost)[0];
  }
  return available[0]; // first in list (priority order)
}

/**
 * Execute with the right provider.
 * Returns: { output, model, provider, task_type, duration_ms, usage }
 */
async function execute(clients, options) {
  const { prompt, system, task, max_tokens, temperature = 0.7, json = false, history = [] } = options;
  const taskType = detectTask(prompt, task);
  const choice = selectModel(taskType, options);
  const startTime = Date.now();

  const maxRetries = options.maxRetries ?? 1;
  let attempt = 0;
  let lastError;

  while (attempt <= maxRetries) {
    try {
      const result = await callProvider(clients, choice, { prompt, system, max_tokens, temperature, json, history });
      return {
        output: result.output,
        provider: choice.provider,
        model: choice.model,
        task_type: taskType,
        duration_ms: Date.now() - startTime,
        usage: result.usage,
        attempt: attempt + 1,
      };
    } catch (err) {
      lastError = err;
      attempt++;

      // Try fallback provider after first failure
      if (attempt <= maxRetries) {
        const allCandidates = MODEL_REGISTRY[taskType] || [];
        const fallback = allCandidates.find(c => c.provider !== choice.provider && PROVIDERS[c.provider]?.available);
        if (fallback) {
          choice.provider = fallback.provider;
          choice.model = fallback.model;
        }
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }
  throw lastError;
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
  PROVIDERS,
  MODEL_REGISTRY,
  TASK_PATTERNS,
  detectTask,
  selectModel,
  execute,
  safeJsonParse,
};