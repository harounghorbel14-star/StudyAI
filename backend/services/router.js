// ============================================================
// 🧠 services/router.js — Intelligent Model Router
// Dynamic model selection based on task type, cost, speed
// ============================================================

const MODEL_REGISTRY = {
  'reasoning-deep':  { model: 'gpt-4o',                cost: 5,   speed: 3,  quality: 10, max_tokens: 4000 },
  'reasoning-fast':  { model: 'gpt-4o-mini',           cost: 1,   speed: 9,  quality: 7,  max_tokens: 2000 },
  'coding-strong':   { model: 'gpt-4o',                cost: 5,   speed: 4,  quality: 10, max_tokens: 4000 },
  'coding-fast':     { model: 'gpt-4o-mini',           cost: 1,   speed: 9,  quality: 7,  max_tokens: 2000 },
  'creative':        { model: 'gpt-4o',                cost: 5,   speed: 4,  quality: 10, max_tokens: 3000 },
  'extraction':      { model: 'gpt-4o-mini',           cost: 1,   speed: 9,  quality: 8,  max_tokens: 1000 },
  'classification':  { model: 'gpt-4o-mini',           cost: 1,   speed: 9,  quality: 9,  max_tokens: 500  },
  'summarization':   { model: 'gpt-4o-mini',           cost: 1,   speed: 9,  quality: 8,  max_tokens: 800  },
  'embedding':       { model: 'text-embedding-3-small', cost: 0.1, speed: 10, quality: 9, max_tokens: 0 },
};

const TASK_PATTERNS = [
  { patterns: ['debug', 'fix bug', 'error', 'why does', 'troubleshoot', 'investigate'], task: 'reasoning-deep' },
  { patterns: ['code', 'function', 'class', 'implement', 'build code', 'algorithm', 'refactor'], task: 'coding-strong' },
  { patterns: ['quick', 'short', 'brief', 'tldr', 'one line'], task: 'summarization' },
  { patterns: ['summarize', 'summary', 'recap', 'overview'], task: 'summarization' },
  { patterns: ['extract', 'parse', 'find all', 'list the'], task: 'extraction' },
  { patterns: ['classify', 'categorize', 'is this', 'detect'], task: 'classification' },
  { patterns: ['write', 'story', 'creative', 'poem', 'imagine', 'compose'], task: 'creative' },
  { patterns: ['plan', 'analyze', 'compare', 'evaluate', 'decide', 'strategy'], task: 'reasoning-deep' },
];

function detectTask(prompt, hint) {
  if (hint && MODEL_REGISTRY[hint]) return hint;
  const lower = String(prompt || '').toLowerCase();
  for (const { patterns, task } of TASK_PATTERNS) {
    if (patterns.some(p => lower.includes(p))) return task;
  }
  return lower.length < 200 ? 'reasoning-fast' : 'reasoning-deep';
}

function selectModel(taskType) {
  return MODEL_REGISTRY[taskType] || MODEL_REGISTRY['reasoning-fast'];
}

function buildConfig({ prompt, system, task, max_tokens, temperature = 0.7, json = false, stream = false, history = [] }) {
  const taskType = detectTask(prompt, task);
  const modelInfo = selectModel(taskType);

  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  history.slice(-10).forEach(m => messages.push({ role: m.role, content: m.content }));
  messages.push({ role: 'user', content: prompt });

  const config = {
    model: modelInfo.model,
    max_tokens: max_tokens || modelInfo.max_tokens,
    temperature,
    messages,
  };
  if (json) config.response_format = { type: 'json_object' };
  if (stream) config.stream = true;

  return { config, taskType, modelInfo };
}

async function execute(openai, options) {
  const { config, taskType, modelInfo } = buildConfig(options);
  const startTime = Date.now();

  let attempt = 0;
  const maxRetries = options.maxRetries ?? 2;
  let lastError;

  while (attempt <= maxRetries) {
    try {
      const result = await openai.chat.completions.create(config);
      const output = result.choices[0]?.message?.content || '';

      return {
        output: options.json ? safeJsonParse(output) : output,
        model: modelInfo.model,
        task_type: taskType,
        duration_ms: Date.now() - startTime,
        usage: result.usage,
        attempt: attempt + 1,
      };
    } catch (err) {
      lastError = err;
      attempt++;

      // Fallback: if strong model fails, try fast model
      if (attempt > maxRetries && taskType.endsWith('-deep')) {
        config.model = MODEL_REGISTRY[taskType.replace('-deep', '-fast')]?.model || config.model;
      }
      if (attempt <= maxRetries) {
        await new Promise(r => setTimeout(r, Math.min(1000 * Math.pow(2, attempt - 1), 5000)));
      }
    }
  }
  throw lastError;
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (_) {
    const cleaned = String(text).replace(/```json|```/g, '').trim();
    try { return JSON.parse(cleaned); }
    catch (_) { return { _raw: text, _parse_error: true }; }
  }
}

module.exports = {
  MODEL_REGISTRY,
  TASK_PATTERNS,
  detectTask,
  selectModel,
  buildConfig,
  execute,
  safeJsonParse,
};