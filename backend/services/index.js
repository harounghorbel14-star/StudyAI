// ============================================================
// 📦 services/index.js — Central service exports
// ============================================================
const router = require('./router');
const { SmartCache } = require('./cache');
const { Orchestrator } = require('./orchestrator');
const { MemoryService } = require('./memory');
const { Logger } = require('./logger');
const { WorkerQueue } = require('./workers');
const security = require('./security');

/**
 * Initialize all services with shared dependencies.
 * Returns a single object with all services ready to use.
 */
function initServices(db, openai, options = {}) {
  const logger = new Logger({ level: process.env.LOG_LEVEL || 'info', context: 'NexusAI', db });
  const cache = new SmartCache(db, options.cache);
  const memory = new MemoryService(db);
  const workers = new WorkerQueue(db, options.workers);

  // Auto-start workers
  if (options.startWorkers !== false) workers.start();

  // Helper to create orchestrators with shared deps
  const createOrchestrator = (graph, opts = {}) => new Orchestrator(graph, {
    openai,
    cache,
    onEvent: opts.onEvent,
    userId: opts.userId,
    maxRetries: opts.maxRetries,
  });

  // Smart AI call with router + cache
  const smartCall = async (params) => {
    if (params.cacheable !== false) {
      const cached = cache.get(['smart_call', params.prompt, params.system]);
      if (cached) return { ...cached, _cached: true };
    }
    const result = await router.execute(openai, params);
    if (params.cacheable !== false) {
      cache.set(['smart_call', params.prompt, params.system], result, {
        ttl: params.cacheTTL || 1800,
        model: result.model,
        task_type: result.task_type,
      });
    }
    return result;
  };

  return {
    router,
    cache,
    memory,
    logger,
    workers,
    security,
    Orchestrator,
    createOrchestrator,
    smartCall,
  };
}

module.exports = {
  initServices,
  router,
  SmartCache,
  Orchestrator,
  MemoryService,
  Logger,
  WorkerQueue,
  security,
};