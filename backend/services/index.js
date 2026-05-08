// ============================================================
// 📦 services/index.js — Composition Root
// Wires all services into a unified production-grade ecosystem
// ============================================================

const { SmartCache } = require('./cache');
const { Logger } = require('./logger');
const { MemoryService } = require('./memory');
const { Orchestrator } = require('./orchestrator');
const { CompoundIntelligence } = require('./compound-intelligence');

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
 * Returns one cohesive services object.
 */
function initServices(db, openai, options = {}) {
  // 1. Logger first
  const logger = new Logger({
    level: process.env.LOG_LEVEL || 'info',
    context: 'NexusAI',
  });

  // 2. Anthropic client (optional)
  let anthropic = null;
  try {
    if (process.env.ANTHROPIC_API_KEY) {
      const Anthropic = require('@anthropic-ai/sdk');
      anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      logger.info('Anthropic client ready');
    }
  } catch (_) {}

  const clients = { openai, anthropic };

  // 3. Cache (Upstash → memory)
  const cache = new SmartCache({
    maxMemorySize: options.cacheMaxMemory || 500,
    defaultTTL: options.cacheTTL || 3600,
    namespace: options.namespace || 'nx',
  });

  // 4. Memory service (graph + long-term)
  const memory = new MemoryService(db);

  // 5. Metrics & monitoring
  const metrics = new MetricsService({ logger });

  // 6. Circuit breakers for external services
  const breakers = new CircuitBreakerRegistry();
  breakers.get('openai', { failureThreshold: 5, timeout: 30000 });
  breakers.get('anthropic', { failureThreshold: 5, timeout: 30000 });
  breakers.get('deepseek', { failureThreshold: 5, timeout: 30000 });

  // 7. Queue manager
  let redisConfig = null;
  if (process.env.REDIS_URL) {
    try {
      const url = new URL(process.env.REDIS_URL);
      redisConfig = {
        host: url.hostname,
        port: Number(url.port) || 6379,
        password: url.password || undefined,
      };
    } catch (_) {}
  }
  const queues = new QueueManager({ logger, redisConfig });

  // 8. Smart AI call (router + cache + circuit breaker + metrics)
  async function smartCall(params) {
    const cacheable = params.cacheable !== false && !params.stream;
    const cacheKey = ['ai', params.task || 'auto', params.system || '', params.prompt];

    if (cacheable) {
      const cached = await cache.get(cacheKey);
      if (cached !== null) {
        metrics.increment('ai_calls_cached');
        return { ...cached, _cached: true };
      }
    }

    const stopTimer = metrics.startTimer('ai_call_duration');
    metrics.increment('ai_calls_total', 1, { task: params.task || 'auto' });

    try {
      // Determine which provider will be selected
      const taskType = modelRouter.detectTask(params.prompt, params.task);
      const choice = modelRouter.selectModel(taskType);
      const breaker = breakers.get(choice.provider);

      const result = await breaker.execute(() => modelRouter.execute(clients, params));
      stopTimer();

      metrics.increment('ai_calls_success', 1, { provider: result.provider, task: result.task_type });

      if (cacheable) {
        await cache.set(cacheKey, result, { ttl: params.cacheTTL || 1800 });
      }
      return result;
    } catch (err) {
      stopTimer();
      metrics.increment('ai_calls_failed', 1, { error: err.code || 'unknown' });
      metrics.captureError(err, { context: 'smartCall', task: params.task });
      throw err;
    }
  }

  // 9. Compound intelligence (multi-model, validation, refinement)
  const compound = new CompoundIntelligence({
    smartCall,
    cache,
    memory,
    logger: logger.child('compound'),
  });

  // 10. Orchestrator factory
  const createOrchestrator = (graph, opts = {}) => new Orchestrator(graph, {
    openai,
    anthropic,
    cache,
    smartCall,
    onEvent: opts.onEvent,
    userId: opts.userId,
    maxRetries: opts.maxRetries,
    timeout: opts.timeout,
  });

  // 11. Agent runner (using shared smartCall)
  const runAgent = (agentKey, prompt, contextData) =>
    agents.runAgent(smartCall, agentKey, prompt, contextData);

  // 12. Register workers
  if (options.startWorkers !== false) {
    registerWorkers(queues, { logger, openai, smartCall, memory });
  }

  logger.info('Services initialized', {
    cache: cache.redis ? 'redis+memory' : 'memory-only',
    queues: queues.useBullMQ ? 'BullMQ+Redis' : 'in-process',
    providers: modelRouter.PROVIDERS,
    monitoring: { sentry: !!process.env.SENTRY_DSN, posthog: !!process.env.POSTHOG_API_KEY },
  });

  return {
    // Core
    logger,
    cache,
    memory,
    queues,
    metrics,
    breakers,

    // Layers
    router: modelRouter,
    security,
    sse,
    agents,

    // Clients
    openai,
    anthropic,

    // Composition
    Orchestrator,
    createOrchestrator,
    smartCall,
    compound,
    runAgent,
  };
}

module.exports = {
  initServices,
  SmartCache,
  Logger,
  MemoryService,
  Orchestrator,
  QueueManager,
  CompoundIntelligence,
  MetricsService,
};