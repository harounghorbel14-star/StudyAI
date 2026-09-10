// ============================================================
// 🖥️ services/local-llm.ts — Local LLM Provider
// Ollama · llama.cpp · LM Studio · vLLM
// OFF by default; activates when hardware is ready.
// Falls back to cloud APIs automatically when unavailable.
// ============================================================
import type {
  AIResult, Cache, ChatMessage, EventBus, Logger, TaskType, TokenUsage,
} from '../../types/core';

export type LocalBackend = 'ollama' | 'openai-compatible';
export type ModelTier = 'fast' | 'balanced' | 'strong';

export interface ModelSpec {
  context: number;
  tier: ModelTier;
  tasks: TaskType[];
}

export const LOCAL_MODELS: Record<string, ModelSpec> = {
  'llama3.1:8b':       { context: 128000, tier: 'fast',     tasks: ['general', 'summary', 'classification', 'translate'] },
  'llama3.1:70b':      { context: 128000, tier: 'strong',   tasks: ['reasoning-deep', 'general', 'creative', 'code'] },
  'qwen2.5:14b':       { context: 32000,  tier: 'balanced', tasks: ['general', 'code', 'reasoning-fast'] },
  'qwen2.5-coder:7b':  { context: 32000,  tier: 'fast',     tasks: ['code'] },
  'deepseek-coder-v2': { context: 128000, tier: 'strong',   tasks: ['code'] },
  'mistral:7b':        { context: 32000,  tier: 'fast',     tasks: ['general', 'summary'] },
  'phi3:medium':       { context: 128000, tier: 'fast',     tasks: ['general', 'classification'] },
  'gemma2:9b':         { context: 8192,   tier: 'fast',     tasks: ['general', 'summary'] },
};

export const DEFAULT_LOCAL_TASKS: TaskType[] = [
  'classification', 'summary', 'translate', 'extract', 'general',
];

export interface LocalLLMOptions {
  logger?: Logger | null;
  events?: EventBus | null;
  cache?: Cache | null;
  enabled?: boolean;
  baseUrl?: string;
  backend?: LocalBackend;
  defaultModel?: string;
  timeout?: number;
  localTasks?: TaskType[];
}

export interface RouteDecisionInput {
  task?: TaskType;
  tier?: string;
  forceLocal?: boolean;
  forceCloud?: boolean;
}

export interface CompleteParams {
  prompt: string;
  system?: string;
  task?: TaskType;
  json?: boolean;
  max_tokens?: number;
  temperature?: number;
  history?: ChatMessage[];
}

export interface LocalLLMStats {
  requests: number;
  successes: number;
  failures: number;
  fallbacks: number;
  total_ms: number;
}

export interface LocalLLMStatus {
  enabled: boolean;
  available: boolean;
  backend: LocalBackend;
  base_url: string;
  default_model: string;
  installed_models: string[];
  local_tasks: TaskType[];
  consecutive_failures: number;
  stats: LocalLLMStats & {
    avg_duration_ms: number;
    success_rate: number;
    estimated_savings_usd: number;
  };
  catalog: Record<string, ModelSpec>;
}

// Shapes returned by the two supported backends
interface OllamaTagsResponse { models?: Array<{ name: string }> }
interface OpenAIModelsResponse { data?: Array<{ id: string }> }
interface OllamaChatResponse {
  message?: { content?: string };
  prompt_eval_count?: number;
  eval_count?: number;
}
interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: TokenUsage;
}

export class LocalLLM {
  private readonly logger: Logger | null;
  private readonly events: EventBus | null;
  private readonly cache: Cache | null;

  enabled: boolean;
  baseUrl: string;
  backend: LocalBackend;
  defaultModel: string;
  timeout: number;
  localTasks: TaskType[];

  available = false;
  installedModels: string[] = [];
  consecutiveFailures = 0;

  private lastHealthCheck = 0;
  private readonly healthCheckInterval = 60_000;
  readonly maxFailures = 3;

  stats: LocalLLMStats = {
    requests: 0, successes: 0, failures: 0, fallbacks: 0, total_ms: 0,
  };

  constructor(options: LocalLLMOptions = {}) {
    this.logger = options.logger ?? null;
    this.events = options.events ?? null;
    this.cache = options.cache ?? null;

    this.enabled = options.enabled ?? (process.env.LOCAL_LLM_ENABLED === 'true');
    this.baseUrl = options.baseUrl || process.env.LOCAL_LLM_URL || 'http://localhost:11434';
    this.backend = (options.backend || process.env.LOCAL_LLM_BACKEND || 'ollama') as LocalBackend;
    this.defaultModel = options.defaultModel || process.env.LOCAL_LLM_MODEL || 'llama3.1:8b';
    this.timeout = Number(options.timeout ?? process.env.LOCAL_LLM_TIMEOUT ?? 120_000);

    const envTasks = process.env.LOCAL_LLM_TASKS;
    this.localTasks =
      options.localTasks ??
      (envTasks ? (envTasks.split(',').map((s) => s.trim()) as TaskType[]) : DEFAULT_LOCAL_TASKS);
  }

  // ─── Health check ─────────────────────────
  async checkHealth(force = false): Promise<boolean> {
    const now = Date.now();
    if (!force && now - this.lastHealthCheck < this.healthCheckInterval) {
      return this.available;
    }
    this.lastHealthCheck = now;

    if (!this.enabled) {
      this.available = false;
      return false;
    }

    try {
      const url = this.backend === 'ollama'
        ? `${this.baseUrl}/api/tags`
        : `${this.baseUrl}/v1/models`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      if (this.backend === 'ollama') {
        const data = (await res.json()) as OllamaTagsResponse;
        this.installedModels = (data.models ?? []).map((m) => m.name);
      } else {
        const data = (await res.json()) as OpenAIModelsResponse;
        this.installedModels = (data.data ?? []).map((m) => m.id);
      }

      this.available = this.installedModels.length > 0;
      this.consecutiveFailures = 0;

      if (this.available) {
        this.logger?.info('Local LLM available', {
          backend: this.backend,
          models: this.installedModels.length,
        });
      }
      return this.available;
    } catch {
      this.available = false;
      this.consecutiveFailures++;
      if (this.consecutiveFailures === 1) {
        this.logger?.warn('Local LLM unreachable, using cloud APIs', { url: this.baseUrl });
      }
      return false;
    }
  }

  // ─── Routing decision ─────────────────────
  // Order matters: forceCloud is the strongest guarantee, and a
  // disabled or unhealthy backend can never be forced into service.
  shouldRouteLocal({ task, forceLocal, forceCloud }: RouteDecisionInput): boolean {
    if (forceCloud) return false;
    if (!this.enabled) return false;
    if (!this.available) return false;
    if (this.consecutiveFailures >= this.maxFailures) return false;
    if (forceLocal) return true;
    return this.localTasks.includes(task ?? 'general');
  }

  // ─── Model selection ──────────────────────
  pickModel(task: TaskType): string {
    for (const [name, spec] of Object.entries(LOCAL_MODELS)) {
      if (spec.tasks.includes(task) && this.isInstalled(name)) return name;
    }
    if (this.isInstalled(this.defaultModel)) return this.defaultModel;
    return this.installedModels[0] ?? this.defaultModel;
  }

  // Family-level match only. A loose prefix match would let
  // "qwen2.5-coder:7b" wrongly satisfy a request for "qwen2.5".
  private isInstalled(name: string): boolean {
    const base = name.split(':')[0];
    return this.installedModels.some((m) => m === name || m.split(':')[0] === base);
  }

  // ─── Completion ───────────────────────────
  async complete(params: CompleteParams): Promise<AIResult> {
    const start = Date.now();
    this.stats.requests++;

    const task = params.task ?? 'general';
    const model = this.pickModel(task);
    const messages: ChatMessage[] = [];
    if (params.system) messages.push({ role: 'system', content: params.system });
    for (const h of params.history ?? []) messages.push(h);
    messages.push({ role: 'user', content: params.prompt });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      let rawOutput = '';
      let usage: TokenUsage = {};

      if (this.backend === 'ollama') {
        const res = await fetch(`${this.baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            model,
            messages,
            stream: false,
            format: params.json ? 'json' : undefined,
            options: {
              temperature: params.temperature ?? 0.7,
              num_predict: params.max_tokens ?? 2048,
            },
          }),
        });
        if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
        const data = (await res.json()) as OllamaChatResponse;
        rawOutput = data.message?.content ?? '';
        usage = {
          prompt_tokens: data.prompt_eval_count ?? 0,
          completion_tokens: data.eval_count ?? 0,
        };
      } else {
        const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            model,
            messages,
            temperature: params.temperature ?? 0.7,
            max_tokens: params.max_tokens ?? 2048,
            response_format: params.json ? { type: 'json_object' } : undefined,
          }),
        });
        if (!res.ok) throw new Error(`Local LLM HTTP ${res.status}`);
        const data = (await res.json()) as OpenAIChatResponse;
        rawOutput = data.choices?.[0]?.message?.content ?? '';
        usage = data.usage ?? {};
      }

      clearTimeout(timer);
      const duration = Date.now() - start;
      this.stats.successes++;
      this.stats.total_ms += duration;
      this.consecutiveFailures = 0;

      let output: string | Record<string, unknown> = rawOutput;
      if (params.json) {
        try {
          output = JSON.parse(rawOutput.replace(/```json|```/g, '').trim());
        } catch {
          // Keep the raw text — the caller can decide how to handle it.
        }
      }

      this.events?.emit('local_llm.completed', { model, task, duration_ms: duration });

      return {
        output,
        model,
        provider: 'local',
        task_type: task,
        duration_ms: duration,
        usage,
        cost_usd: 0,
      };
    } catch (err: unknown) {
      clearTimeout(timer);
      this.stats.failures++;
      this.consecutiveFailures++;
      const message = err instanceof Error ? err.message : String(err);
      this.events?.emit('local_llm.failed', { model, task, error: message });
      throw new Error(`Local LLM failed: ${message}`);
    }
  }

  // ─── Streaming ────────────────────────────
  async *stream(params: CompleteParams): AsyncGenerator<string, void, unknown> {
    const task = params.task ?? 'general';
    const model = this.pickModel(task);
    const messages: ChatMessage[] = [];
    if (params.system) messages.push({ role: 'system', content: params.system });
    messages.push({ role: 'user', content: params.prompt });

    const isOllama = this.backend === 'ollama';
    const url = isOllama
      ? `${this.baseUrl}/api/chat`
      : `${this.baseUrl}/v1/chat/completions`;

    const body = isOllama
      ? {
          model, messages, stream: true,
          options: {
            temperature: params.temperature ?? 0.7,
            num_predict: params.max_tokens ?? 2048,
          },
        }
      : {
          model, messages, stream: true,
          temperature: params.temperature ?? 0.7,
          max_tokens: params.max_tokens ?? 2048,
        };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Local LLM stream HTTP ${res.status}`);
    if (!res.body) throw new Error('Local LLM stream returned no body');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          if (isOllama) {
            const chunk = JSON.parse(line) as OllamaChatResponse & { done?: boolean };
            const content = chunk.message?.content;
            if (content) yield content;
            if (chunk.done) return;
          } else {
            if (!line.startsWith('data: ')) continue;
            const payload = line.slice(6);
            if (payload === '[DONE]') return;
            const chunk = JSON.parse(payload) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) yield delta;
          }
        } catch {
          // Skip malformed chunks rather than aborting the stream.
        }
      }
    }
  }

  // ─── Local embeddings ─────────────────────
  async embed(text: string): Promise<number[]> {
    if (!this.available) throw new Error('Local LLM unavailable');
    const model = process.env.LOCAL_EMBED_MODEL || 'nomic-embed-text';
    try {
      const res = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt: String(text).slice(0, 8000) }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { embedding?: number[] };
      if (!data.embedding) throw new Error('no embedding in response');
      return data.embedding;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Local embedding failed: ${message}`);
    }
  }

  // ─── Runtime configuration ────────────────
  enable(config: Partial<Pick<LocalLLMOptions, 'baseUrl' | 'backend' | 'defaultModel' | 'localTasks'>> = {}): Promise<boolean> {
    this.enabled = true;
    if (config.baseUrl) this.baseUrl = config.baseUrl;
    if (config.backend) this.backend = config.backend;
    if (config.defaultModel) this.defaultModel = config.defaultModel;
    if (config.localTasks) this.localTasks = config.localTasks;
    this.consecutiveFailures = 0;
    return this.checkHealth(true);
  }

  disable(): void {
    this.enabled = false;
    this.available = false;
  }

  setLocalTasks(tasks: TaskType[]): void {
    this.localTasks = Array.isArray(tasks) ? tasks : DEFAULT_LOCAL_TASKS;
  }

  // ─── Status ───────────────────────────────
  getStatus(): LocalLLMStatus {
    const avgMs = this.stats.successes > 0
      ? Math.round(this.stats.total_ms / this.stats.successes)
      : 0;
    return {
      enabled: this.enabled,
      available: this.available,
      backend: this.backend,
      base_url: this.baseUrl,
      default_model: this.defaultModel,
      installed_models: this.installedModels,
      local_tasks: this.localTasks,
      consecutive_failures: this.consecutiveFailures,
      stats: {
        ...this.stats,
        avg_duration_ms: avgMs,
        success_rate: this.stats.requests > 0 ? this.stats.successes / this.stats.requests : 0,
        estimated_savings_usd: this.stats.successes * 0.002,
      },
      catalog: LOCAL_MODELS,
    };
  }

  getSetupInstructions() {
    return {
      ollama: {
        install: {
          linux: 'curl -fsSL https://ollama.com/install.sh | sh',
          mac: 'brew install ollama',
          windows: 'Download from https://ollama.com/download',
        },
        pull_models: [
          'ollama pull llama3.1:8b       # 4.7GB - fast, good general',
          'ollama pull qwen2.5-coder:7b  # 4.7GB - best for code',
          'ollama pull nomic-embed-text  # 274MB - embeddings',
        ],
        start: 'ollama serve  # runs on http://localhost:11434',
        env: {
          LOCAL_LLM_ENABLED: 'true',
          LOCAL_LLM_URL: 'http://localhost:11434',
          LOCAL_LLM_BACKEND: 'ollama',
          LOCAL_LLM_MODEL: 'llama3.1:8b',
          LOCAL_LLM_TASKS: 'classification,summary,translate,extract,general',
        },
      },
      hardware_guide: {
        '8B model':  { ram: '8GB',  gpu_vram: '6GB',  cpu_speed: '3-8 tok/s', gpu_speed: '40-80 tok/s' },
        '14B model': { ram: '16GB', gpu_vram: '10GB', cpu_speed: '2-4 tok/s', gpu_speed: '25-50 tok/s' },
        '70B model': { ram: '48GB', gpu_vram: '40GB', cpu_speed: '<1 tok/s',  gpu_speed: '10-20 tok/s' },
      },
      recommended_vps: [
        { provider: 'Hetzner',     spec: 'CPX41 (8 vCPU, 16GB)', price: '~$30/mo',   note: 'CPU only, 8B viable' },
        { provider: 'RunPod',      spec: 'RTX 4090 (24GB VRAM)', price: '~$0.34/hr', note: 'Best price/perf for GPU' },
        { provider: 'Vast.ai',     spec: 'RTX 3090',             price: '~$0.20/hr', note: 'Cheapest GPU option' },
        { provider: 'Lambda Labs', spec: 'A10 (24GB)',           price: '~$0.60/hr', note: 'Reliable, good uptime' },
      ],
    };
  }
}