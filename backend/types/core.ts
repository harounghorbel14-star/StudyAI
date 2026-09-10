// ============================================================
// 📐 types/core.ts — Shared type foundation
// Every migrated module imports from here. Single source of truth.
// ============================================================

// ─── Plans & roles ──────────────────────────
export type Plan = 'free' | 'pro' | 'elite' | 'team';
export type Role = 'admin' | 'pro' | 'free' | 'guest';
export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';
export type Severity = 'info' | 'warn' | 'error' | 'critical';

export type TaskType =
  | 'reasoning-deep'
  | 'reasoning-fast'
  | 'creative'
  | 'classification'
  | 'code'
  | 'summary'
  | 'translate'
  | 'extract'
  | 'general';

export type OperationalMode = 'calm' | 'focus' | 'creator' | 'strategy';
export type MediaType = 'image' | 'video' | '3d' | 'audio';

// ─── Database abstraction ───────────────────
// Matches better-sqlite3's synchronous surface. The Postgres adapter
// implements the same shape so services stay backend-agnostic.
export interface RunResult {
  changes: number;
  lastInsertRowid?: number | bigint;
}

export interface Statement<TRow = Record<string, unknown>> {
  run(...params: unknown[]): RunResult;
  get(...params: unknown[]): TRow | undefined;
  all(...params: unknown[]): TRow[];
}

export interface Database {
  prepare<TRow = Record<string, unknown>>(sql: string): Statement<TRow>;
  exec?(sql: string): void;
  pragma?(directive: string): unknown;
  close?(): void;
}

// ─── Logging ────────────────────────────────
export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  child(name: string): Logger;
}

// ─── Events ─────────────────────────────────
export type NexusEventType =
  | 'ai.call.start' | 'ai.call.done' | 'ai.call.fail' | 'ai.call.cached'
  | 'orch.start' | 'orch.node.done' | 'orch.node.fail' | 'orch.complete'
  | 'agent.start' | 'agent.done' | 'agent.fail'
  | 'workspace.created' | 'workspace.member_added' | 'workspace.invite_sent'
  | 'media.generate.start' | 'media.generate.done' | 'media.generate.fail'
  | 'voice.transcribed' | 'voice.synthesized'
  | 'secret.stored' | 'secret.expiring' | 'secret.rotated'
  | 'reputation.awarded' | 'marketplace.published' | 'marketplace.installed'
  | 'payment.subscription_created' | 'payment.subscription_cancelled'
  | 'security.rate_limited'
  | 'local_llm.completed' | 'local_llm.failed'
  | 'embedding.indexed'
  | (string & {}); // allow forward-compatible custom events

export interface EventBus {
  emit(type: NexusEventType, payload?: Record<string, unknown>): void;
  on(type: NexusEventType, handler: (payload: any) => void): void;
  off?(type: NexusEventType, handler: (payload: any) => void): void;
}

// ─── Cache ──────────────────────────────────
export interface Cache {
  get<T = unknown>(key: unknown[] | string): Promise<T | null>;
  set(key: unknown[] | string, value: unknown, ttlSeconds?: number): Promise<void>;
  del?(key: unknown[] | string): Promise<void>;
}

// ─── AI ─────────────────────────────────────
export interface TokenUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICallParams {
  prompt: string;
  system?: string;
  task?: TaskType;
  json?: boolean;
  stream?: boolean;
  cacheable?: boolean;
  cacheTTL?: number;
  user_id?: number;
  tier?: Plan;
  operation?: string;
  history?: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  forceLocal?: boolean;
  forceCloud?: boolean;
}

export interface AIResult<TOutput = string | Record<string, unknown>> {
  output: TOutput;
  model: string;
  provider: string;
  task_type: TaskType | string;
  duration_ms: number;
  usage?: TokenUsage;
  cached?: boolean | string;
  cost_usd?: number;
}

export type SmartCall = <T = string | Record<string, unknown>>(
  params: AICallParams
) => Promise<AIResult<T>>;

// ─── Common service constructor shape ───────
export interface BaseServiceOptions {
  db?: Database;
  logger?: Logger;
  events?: EventBus;
  cache?: Cache;
  smartCall?: SmartCall;
}

// ─── Result helpers ─────────────────────────
export interface OkResult {
  ok: true;
  [key: string]: unknown;
}

export interface ErrResult {
  ok: false;
  reason?: string;
  error?: string;
}

export type Result = OkResult | ErrResult;