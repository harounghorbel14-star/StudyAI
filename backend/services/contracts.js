// ============================================================
// 📋 services/contracts.js — Unified Schemas & Validators
// Single source of truth for orchestration, agents, events, results.
// Ensures system cohesion: every subsystem speaks the same language.
// ============================================================

// ─── Orchestration node schema ────────────
function isOrchestrationNode(node) {
  if (!node || typeof node !== 'object') return false;
  if (typeof node.prompt !== 'string' && typeof node.prompt !== 'function') return false;
  if (node.depends_on && !Array.isArray(node.depends_on)) return false;
  return true;
}

function validateOrchestrationGraph(graph) {
  if (!graph || typeof graph !== 'object') return { valid: false, error: 'Graph must be an object' };
  const errors = [];
  for (const [name, node] of Object.entries(graph)) {
    if (!isOrchestrationNode(node)) errors.push(`Node '${name}' invalid`);
    for (const dep of (node.depends_on || [])) {
      if (!graph[dep]) errors.push(`Node '${name}' depends on missing '${dep}'`);
    }
  }
  return { valid: !errors.length, errors };
}

// ─── Standardized AI result format ────────
function makeAIResult({ output, model, provider, task_type, duration_ms, usage, cached = false, attempt = 1 }) {
  return {
    output,
    model: model || 'unknown',
    provider: provider || 'unknown',
    task_type: task_type || 'auto',
    duration_ms: duration_ms || 0,
    usage: usage || null,
    cached: !!cached,
    attempt,
    _schema: 'ai_result_v1',
    _ts: Date.now(),
  };
}

// ─── Standardized agent output ────────────
function makeAgentResult({ agent, name, role, emoji, output, duration_ms, model, provider, success = true, error = null }) {
  return {
    agent,
    name,
    role,
    emoji: emoji || '🤖',
    output,
    duration_ms: duration_ms || 0,
    model,
    provider,
    success,
    error,
    _schema: 'agent_result_v1',
    _ts: Date.now(),
  };
}

// ─── Standardized SSE event ───────────────
function makeSSEEvent(type, data = {}) {
  return {
    type,
    ts: Date.now(),
    ...data,
    _schema: 'sse_event_v1',
  };
}

// ─── Standardized validation result ───────
function makeValidationResult({ score, passes, confidence, issues = [], strengths = [], improvement_hint = '' }) {
  return {
    score: Math.max(0, Math.min(100, Math.round(score || 0))),
    passes: !!passes,
    confidence: Math.max(0, Math.min(100, Math.round(confidence || score || 0))),
    issues,
    strengths,
    improvement_hint,
    _schema: 'validation_v1',
    _ts: Date.now(),
  };
}

// ─── Standardized error response ──────────
function makeErrorResponse(error, code = 'unknown') {
  return {
    error: error?.message || String(error),
    code,
    ts: Date.now(),
  };
}

// ─── Standardized health response ─────────
function makeHealthResponse(services, customChecks = {}) {
  const checks = { ...customChecks };
  let overall = 'healthy';

  // Auto-check core services
  if (services.cache) checks.cache = !!services.cache.redis ? 'redis+memory' : 'memory-only';
  if (services.queues) checks.queues = services.queues.useBullMQ ? 'bullmq' : 'in-process';
  if (services.breakers) {
    const stats = services.breakers.stats();
    const open = stats.filter(b => b.state === 'OPEN').length;
    checks.breakers_open = open;
    if (open > 0) overall = 'degraded';
  }

  return {
    status: overall,
    uptime_seconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    checks,
    _schema: 'health_v1',
  };
}

// ─── Common task types (shared vocabulary) ──
const TASK_TYPES = Object.freeze([
  'reasoning-deep',
  'reasoning-fast',
  'coding-strong',
  'coding-fast',
  'creative',
  'extraction',
  'classification',
  'summarization',
  'embedding',
]);

// ─── Common agent roles ───────────────────
const AGENT_ROLES = Object.freeze([
  'ceo', 'product', 'designer', 'backend', 'frontend',
  'devops', 'qa', 'security', 'validator',
  'marketing', 'analyst', 'researcher',
  'planner', 'supervisor', 'refiner',
]);

module.exports = {
  // Validators
  isOrchestrationNode,
  validateOrchestrationGraph,

  // Factories
  makeAIResult,
  makeAgentResult,
  makeSSEEvent,
  makeValidationResult,
  makeErrorResponse,
  makeHealthResponse,

  // Constants
  TASK_TYPES,
  AGENT_ROLES,
};