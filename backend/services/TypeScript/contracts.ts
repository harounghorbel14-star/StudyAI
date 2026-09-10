// ============================================================
// 📋 services/contracts.ts — Unified Schemas & Factories
// Single source of truth for orchestration, agents, events, results.
// Every subsystem speaks this language.
// ============================================================
import type { TokenUsage } from '../../types/core';

// ─── Orchestration ──────────────────────────
export interface OrchestrationNode {
  prompt: string | ((context: Record<string, unknown>) => string);
  depends_on?: string[];
  task?: string;
  system?: string;
  [key: string]: unknown;
}

export type OrchestrationGraph = Record<string, OrchestrationNode>;

export interface GraphValidation {
  valid: boolean;
  errors: string[];
  error?: string;
}

export function isOrchestrationNode(node: unknown): node is OrchestrationNode {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return false;
  const candidate = node as Record<string, unknown>;
  const promptType = typeof candidate.prompt;
  if (promptType !== 'string' && promptType !== 'function') return false;
  if (candidate.depends_on !== undefined && !Array.isArray(candidate.depends_on)) return false;
  return true;
}

export function validateOrchestrationGraph(graph: unknown): GraphValidation {
  if (!graph || typeof graph !== 'object' || Array.isArray(graph)) {
    return { valid: false, errors: ['Graph must be an object'], error: 'Graph must be an object' };
  }

  const errors: string[] = [];
  const entries = Object.entries(graph as Record<string, unknown>);

  for (const [name, node] of entries) {
    // Skip dependency inspection for an invalid node. Reading
    // `node.depends_on` on a null node throws instead of reporting.
    if (!isOrchestrationNode(node)) {
      errors.push(`Node '${name}' invalid`);
      continue;
    }
    for (const dep of node.depends_on ?? []) {
      if (!(dep in (graph as Record<string, unknown>))) {
        errors.push(`Node '${name}' depends on missing '${dep}'`);
      }
    }
  }

  // A graph with no nodes cannot be executed.
  if (entries.length === 0) errors.push('Graph is empty');

  return { valid: errors.length === 0, errors };
}

/** Detect dependency cycles, which would hang the orchestrator. */
export function findCycles(graph: OrchestrationGraph): string[][] {
  const cycles: string[][] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const walk = (name: string, path: string[]): void => {
    if (visiting.has(name)) {
      const start = path.indexOf(name);
      cycles.push(path.slice(start).concat(name));
      return;
    }
    if (visited.has(name)) return;

    visiting.add(name);
    for (const dep of graph[name]?.depends_on ?? []) {
      if (graph[dep]) walk(dep, [...path, name]);
    }
    visiting.delete(name);
    visited.add(name);
  };

  for (const name of Object.keys(graph)) walk(name, []);
  return cycles;
}

// ─── AI result ──────────────────────────────
export type CachedFlag = boolean | 'exact' | 'similar';

export interface AIResultInput {
  output: unknown;
  model?: string;
  provider?: string;
  task_type?: string;
  duration_ms?: number;
  usage?: TokenUsage | null;
  cached?: CachedFlag;
  attempt?: number;
}

export interface StandardAIResult {
  output: unknown;
  model: string;
  provider: string;
  task_type: string;
  duration_ms: number;
  usage: TokenUsage | null;
  cached: CachedFlag;
  attempt: number;
  _schema: 'ai_result_v1';
  _ts: number;
}

export function makeAIResult(input: AIResultInput): StandardAIResult {
  return {
    output: input.output,
    model: input.model || 'unknown',
    provider: input.provider || 'unknown',
    task_type: input.task_type || 'auto',
    duration_ms: input.duration_ms ?? 0,
    usage: input.usage ?? null,
    // Preserve a string flag ('exact' | 'similar') rather than
    // collapsing it to a boolean — callers distinguish the two.
    cached: input.cached ?? false,
    attempt: input.attempt ?? 1,
    _schema: 'ai_result_v1',
    _ts: Date.now(),
  };
}

// ─── Agent result ───────────────────────────
export interface AgentResultInput {
  agent: string;
  name?: string;
  role?: string;
  emoji?: string;
  output?: unknown;
  duration_ms?: number;
  model?: string;
  provider?: string;
  success?: boolean;
  error?: string | null;
}

export interface StandardAgentResult {
  agent: string;
  name?: string;
  role?: string;
  emoji: string;
  output?: unknown;
  duration_ms: number;
  model?: string;
  provider?: string;
  success: boolean;
  error: string | null;
  _schema: 'agent_result_v1';
  _ts: number;
}

export function makeAgentResult(input: AgentResultInput): StandardAgentResult {
  return {
    agent: input.agent,
    name: input.name,
    role: input.role,
    emoji: input.emoji || '🤖',
    output: input.output,
    duration_ms: input.duration_ms ?? 0,
    model: input.model,
    provider: input.provider,
    success: input.success ?? true,
    error: input.error ?? null,
    _schema: 'agent_result_v1',
    _ts: Date.now(),
  };
}

// ─── SSE event ──────────────────────────────
export interface StandardSSEEvent {
  type: string;
  ts: number;
  _schema: 'sse_event_v1';
  [key: string]: unknown;
}

export function makeSSEEvent(
  type: string,
  data: Record<string, unknown> = {}
): StandardSSEEvent {
  return { ...data, type, ts: Date.now(), _schema: 'sse_event_v1' };
}

// ─── Validation result ──────────────────────
export interface ValidationResultInput {
  score?: number;
  passes?: boolean;
  confidence?: number;
  issues?: string[];
  strengths?: string[];
  improvement_hint?: string;
}

export interface StandardValidationResult {
  score: number;
  passes: boolean;
  confidence: number;
  issues: string[];
  strengths: string[];
  improvement_hint: string;
  _schema: 'validation_v1';
  _ts: number;
}

const clampPercent = (value: number): number =>
  Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)));

export function makeValidationResult(
  input: ValidationResultInput
): StandardValidationResult {
  const score = clampPercent(input.score ?? 0);
  return {
    score,
    passes: Boolean(input.passes),
    confidence: clampPercent(input.confidence ?? input.score ?? 0),
    issues: input.issues ?? [],
    strengths: input.strengths ?? [],
    improvement_hint: input.improvement_hint ?? '',
    _schema: 'validation_v1',
    _ts: Date.now(),
  };
}

// ─── Error response ─────────────────────────
export interface StandardErrorResponse {
  error: string;
  code: string;
  ts: number;
}

export function makeErrorResponse(
  error: unknown,
  code = 'unknown'
): StandardErrorResponse {
  const message =
    error instanceof Error ? error.message
    : typeof error === 'string' ? error
    : String(error);
  return { error: message, code, ts: Date.now() };
}

// ─── Health response ────────────────────────
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthServices {
  cache?: { redis?: unknown };
  queues?: { useBullMQ?: boolean };
  breakers?: { stats(): Array<{ state: string }> };
}

export interface StandardHealthResponse {
  status: HealthStatus;
  uptime_seconds: number;
  timestamp: string;
  checks: Record<string, unknown>;
  _schema: 'health_v1';
}

export function makeHealthResponse(
  services: HealthServices,
  customChecks: Record<string, unknown> = {}
): StandardHealthResponse {
  const checks: Record<string, unknown> = { ...customChecks };
  let overall: HealthStatus = 'healthy';

  if (services.cache) {
    checks.cache = services.cache.redis ? 'redis+memory' : 'memory-only';
  }
  if (services.queues) {
    checks.queues = services.queues.useBullMQ ? 'bullmq' : 'in-process';
  }
  if (services.breakers) {
    try {
      const stats = services.breakers.stats();
      const open = stats.filter((b) => b.state === 'OPEN').length;
      checks.breakers_open = open;
      // Any open breaker means a provider is failing.
      if (open > 0) overall = 'degraded';
      if (open >= 3) overall = 'unhealthy';
    } catch {
      checks.breakers_open = 'unavailable';
      overall = 'degraded';
    }
  }

  return {
    status: overall,
    uptime_seconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    checks,
    _schema: 'health_v1',
  };
}

// ─── Shared vocabulary ──────────────────────
export const TASK_TYPES = [
  'reasoning-deep',
  'reasoning-fast',
  'coding-strong',
  'coding-fast',
  'creative',
  'extraction',
  'classification',
  'summarization',
  'embedding',
] as const;

export const AGENT_ROLES = [
  'ceo', 'product', 'designer', 'backend', 'frontend',
  'devops', 'qa', 'security', 'validator',
  'marketing', 'analyst', 'researcher',
  'planner', 'supervisor', 'refiner',
] as const;

export type ContractTaskType = typeof TASK_TYPES[number];
export type AgentRole = typeof AGENT_ROLES[number];