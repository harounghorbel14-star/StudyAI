// ============================================================
// 📦 services/index.js — Composition Root (Production)
// Wires all services into a unified, cohesive ecosystem.
// Every subsystem speaks through: event bus + standard contracts.
// ============================================================

const { SmartCache } = require('./cache');
const { Logger } = require('./logger');
const { MemoryService } = require('./memory');
const { Orchestrator } = require('./orchestrator');
const { CompoundIntelligence } = require('./compound-intelligence');
const { EventBus, EVENTS } = require('./event-bus');
const { ExecutionTracer } = require('./tracer');
const { AdaptiveService } = require('./adaptive');
const contracts = require('./contracts');

const modelRouter = require('../router/model-router');
const security = require('../security/middleware');
const { QueueManager } = require('../queues/queue');
const { registerWorkers } = require('../workers');
const sse = require('../realtime/sse');
const { MetricsService } = require('../monitoring/metrics');
const { CircuitBreakerRegistry } = require('../resilience/circuit-breaker');
const agents = require('../agents/registry');

/**
 * Initialize the full production stack.
 */
function initServices(db, openai, options = {}) {
  // ── 1. Logger first ───────────────────────
  const logger = new Logger({
    level: process.env.LOG_LEVEL || 'info',
    context: 'NexusAI',
  });

  // ── 2. Event bus (system cohesion) ────────
  const events = new EventBus({ logger, maxHistory: 1000 });

  // ── 3. Anthropic client (optional) ────────
  let anthropic = null;
  try {
    if (process.env.ANTHROPIC_API_KEY) {
      const Anthropic = require('@anthropic-ai/sdk');
      anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      logger.info('Anthropic client ready');
    }
  } catch (_) {}

  const clients = { openai, anthropic };

  // ── 4. Cache ──────────────────────────────
  const cache = new SmartCache({
    maxMemorySize: options.cacheMaxMemory || 500,
    defaultTTL: options.cacheTTL || 3600,
    namespace: options.namespace || 'nx',
  });

  // ── 5. Memory service ─────────────────────
  const memory = new MemoryService(db);

  // ── 6. Metrics ────────────────────────────
  const metrics = new MetricsService({ logger });

  // ── 7. Tracer (distributed tracing) ───────
  const tracer = new ExecutionTracer(db);

  // ── 8. Adaptive (usage learning) ──────────
  const adaptive = new AdaptiveService(db);

  // ── 9. Circuit breakers ───────────────────
  const breakers = new CircuitBreakerRegistry();
  breakers.get('openai', { failureThreshold: 5, timeout: 30000 });
  breakers.get('anthropic', { failureThreshold: 5, timeout: 30000 });
  breakers.get('deepseek', { failureThreshold: 5, timeout: 30000 });

  // ── 10. Queues ────────────────────────────
  let redisConfig = null;
  if (process.env.REDIS_URL) {
    try {
      const url = new URL(process.env.REDIS_URL);
      redisConfig = { host: url.hostname, port: Number(url.port) || 6379, password: url.password || undefined };
    } catch (_) {}
  }
  const queues = new QueueManager({ logger, redisConfig });

  // ── 11. Smart AI call (router + cache + breaker + events + adaptive) ──
  async function smartCall(params) {
    const cacheable = params.cacheable !== false && !params.stream;
    const cacheKey = ['ai', params.task || 'auto', params.system || '', params.prompt];

    // Cache check
    if (cacheable) {
      const cached = await cache.get(cacheKey);
      if (cached !== null) {
        metrics.increment('ai_calls_cached');
        events.emit(EVENTS.AI_CALL_CACHED, { task: params.task });
        return { ...cached, cached: true };
      }
    }

    const taskType = modelRouter.detectTask(params.prompt, params.task);
    const choice = modelRouter.selectModel(taskType);
    const breaker = breakers.get(choice.provider);

    const stopTimer = metrics.startTimer('ai_call_duration', { provider: choice.provider });
    metrics.increment('ai_calls_total', 1, { task: taskType });
    events.emit(EVENTS.AI_CALL_START, { task: taskType, provider: choice.provider, model: choice.model });

    try {
      const result = await breaker.execute(() => modelRouter.execute(clients, params));
      const duration = stopTimer();

      const standardized = contracts.makeAIResult({
        output: result.output,
        model: result.model,
        provider: result.provider,
        task_type: result.task_type,
        duration_ms: duration,
        usage: result.usage,
      });

      metrics.increment('ai_calls_success', 1, { provider: result.provider });
      events.emit(EVENTS.AI_CALL_DONE, { provider: result.provider, model: result.model, duration_ms: duration });

      // Adaptive: record outcome
      adaptive.record({
        user_id: params.user_id,
        operation: 'ai_call',
        task_type: result.task_type,
        provider: result.provider,
        model: result.model,
        success: true,
        duration_ms: duration,
      });

      // Cache
      if (cacheable) {
        await cache.set(cacheKey, standardized, { ttl: params.cacheTTL || 1800 });
      }
      return standardized;
    } catch (err) {
      stopTimer();
      metrics.increment('ai_calls_failed', 1, { error: err.code || 'unknown' });
      metrics.captureError(err, { context: 'smartCall', task: params.task });
      events.emit(EVENTS.AI_CALL_FAIL, { error: err.message, code: err.code });

      adaptive.record({
        user_id: params.user_id,
        operation: 'ai_call',
        task_type: taskType,
        provider: choice.provider,
        model: choice.model,
        success: false,
        duration_ms: 0,
      });

      throw err;
    }
  }

  // ── 12. Compound intelligence ─────────────
  const compound = new CompoundIntelligence({
    smartCall,
    cache,
    memory,
    logger: logger.child('compound'),
  });

  // ── 13. Orchestrator factory (with tracing) ──
  const createOrchestrator = (graph, opts = {}) => {
    // Validate graph contract
    const validation = contracts.validateOrchestrationGraph(graph);
    if (!validation.valid) {
      throw new Error('Invalid graph: ' + validation.errors.join('; '));
    }

    // Wrap onEvent to also publish to event bus
    const userEventHandler = opts.onEvent || (() => {});
    const eventHandler = (e) => {
      userEventHandler(e);
      // Mirror to event bus
      if (e.type === 'orchestration_start') events.emit(EVENTS.ORCH_START, e);
      else if (e.type === 'node_done') events.emit(EVENTS.ORCH_NODE_DONE, e);
      else if (e.type === 'node_error') events.emit(EVENTS.ORCH_NODE_FAIL, e);
      else if (e.type === 'orchestration_complete') events.emit(EVENTS.ORCH_COMPLETE, e);
    };

    return new Orchestrator(graph, {
      openai,
      anthropic,
      cache,
      smartCall,
      onEvent: eventHandler,
      userId: opts.userId,
      maxRetries: opts.maxRetries,
      timeout: opts.timeout,
    });
  };

  // ── 14. Agent runner ──────────────────────
  const runAgent = async (agentKey, prompt, contextData) => {
    events.emit(EVENTS.AGENT_START, { agent: agentKey });
    try {
      const result = await agents.runAgent(smartCall, agentKey, prompt, contextData);
      events.emit(EVENTS.AGENT_DONE, { agent: agentKey, model: result.model, duration_ms: result.duration_ms });
      return result;
    } catch (err) {
      events.emit(EVENTS.AGENT_FAIL, { agent: agentKey, error: err.message });
      throw err;
    }
  };

  // ── 15. Subscribe to events for cross-system reactions ──
  // Auto-track errors
  events.on(EVENTS.ERROR, (e) => metrics.increment('system_errors_total'));
  events.on(EVENTS.BREAKER_OPEN, (e) => {
    logger.warn('Circuit breaker opened', e.data);
    metrics.increment('breakers_opened');
  });

  // ── 16. Register workers ──────────────────
  if (options.startWorkers !== false) {
    registerWorkers(queues, { logger, openai, smartCall, memory, events });
  }

  logger.info('Production stack ready', {
    cache: cache.redis ? 'redis+memory' : 'memory-only',
    queues: queues.useBullMQ ? 'BullMQ' : 'in-process',
    providers: Object.fromEntries(Object.entries(modelRouter.PROVIDERS).map(([k, v]) => [k, v.available])),
    monitoring: { sentry: !!process.env.SENTRY_DSN, posthog: !!process.env.POSTHOG_API_KEY },
    event_bus: 'ready',
    tracer: 'ready',
    adaptive: 'ready',
  });

  return {
    // Core
    logger, cache, memory, queues, metrics, breakers,
    events, tracer, adaptive, contracts,

    // Layers
    router: modelRouter,
    security, sse, agents,

    // Clients
    openai, anthropic,

    // Composition
    Orchestrator,
    createOrchestrator,
    smartCall,
    compound,
    runAgent,

    // Constants
    EVENTS,
  };
}

module.exports = {
  initServices,
  SmartCache, Logger, MemoryService,
  Orchestrator, QueueManager,
  CompoundIntelligence, EventBus, EVENTS,
  ExecutionTracer, AdaptiveService,
  contracts,
};