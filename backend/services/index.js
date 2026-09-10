// ============================================================
// 📦 services/index.js — Production Composition Root
// Wires every service into a hardened, cohesive ecosystem.
// ============================================================

// Migration shim: prefers compiled TypeScript (dist/) when present.
const { load } = require('./_resolve');

const { SmartCache } = require('./cache');
const { Logger } = load('services/logger');
const { MemoryService } = require('./memory');
const { Orchestrator } = require('./orchestrator');
const { CompoundIntelligence } = require('./compound-intelligence');
const { EventBus, EVENTS } = load('services/event-bus');
const { ExecutionTracer } = require('./tracer');
const { AdaptiveService } = require('./adaptive');
const { KnowledgeService } = require('./knowledge');
const { BackupService } = require('./backup');
const { CostOptimizer } = require('./cost-optimizer');
const { HealthMonitor } = require('./health-monitor');
const { RepoIntelligence } = require('./repo-intelligence');
const { MediaPipeline, PROVIDERS: MEDIA_PROVIDERS } = require('./media-pipeline');
const { BusinessOps } = require('./business-ops');
const { WorkspacesService, ROLES: WS_ROLES, PERMISSIONS: WS_PERMS } = require('./workspaces');
const { VoiceService } = require('./voice');
const { CommunityService } = require('./community');
const { DisasterRecovery } = require('./disaster-recovery');

const { SemanticCache } = load('services/semantic-cache');
const { PMFAnalytics } = require('./pmf-analytics');
const { AITwin } = load('services/ai-twin');
const { MemoryFabric } = require('./memory-fabric');
const { TemporalUX } = load('services/temporal-ux');
const { EmbeddingsService } = require('./embeddings');
const { NotificationService } = require('./notifications');
const { PaymentsService } = require('./payments');
const { PredictiveExecution } = load('services/predictive-execution');
const { ShadowMode } = require('./shadow-mode');
const { Dreamspace } = require('./dreamspace');
const { RealityMap } = require('./reality-map');
const { LocalLLM } = load('services/local-llm');
const { CSRFProtection, TieredRateLimiter, securityHeaders } = load('security/hardening');
const { Observability } = load('monitoring/observability');
const { ProjectsService } = load('services/projects');
const { OrchestrationService } = load('services/orchestration');
const { DeprecationService } = load('services/deprecation');
const validation = load('security/validation');
const contracts = load('services/contracts');

const modelRouter = require('../router/model-router');
const security = require('../security/middleware');
const { AuditLogger, AUDIT_ACTIONS } = require('../security/audit');
const { ProtectionService } = require('../security/protection');
const { RBAC, ROLES, PERMISSIONS } = load('security/rbac');
const { SecretRotation } = require('../security/secret-rotation');
const { QueueManager } = require('../queues/queue');
const { registerWorkers } = require('../workers');
const sse = require('../realtime/sse');
const { MetricsService } = require('../monitoring/metrics');
const { CircuitBreakerRegistry } = require('../resilience/circuit-breaker');
const agents = require('../agents/registry');

function initServices(db, openai, options = {}) {
  // ── 1. Logger first ───────────────────────
  const logger = new Logger({
    level: process.env.LOG_LEVEL || 'info',
    context: 'NexusAI',
  });

  // ── 2. Event bus ──────────────────────────
  const events = new EventBus({ logger, maxHistory: 1000 });

  // ── 3. Anthropic client (optional) ────────
  let anthropic = null;
  try {
    if (process.env.ANTHROPIC_API_KEY) {
      const Anthropic = require('@anthropic-ai/sdk');
      anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
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

  // ── 7. Tracer ─────────────────────────────
  const tracer = new ExecutionTracer(db);

  // ── 8. Adaptive ───────────────────────────
  const adaptive = new AdaptiveService(db);

  // ── 9. Audit logger ───────────────────────
  const audit = new AuditLogger(db, { logger, events });

  // ── 9b. RBAC ─────────────────────────────
  const rbac = new RBAC({ audit });

  // ── 10. Protection (bot/abuse) ────────────
  const protection = new ProtectionService(db, { logger, events, audit, metrics });

  // ── 11. Cost optimizer ────────────────────
  const cost = new CostOptimizer(db, { logger, events, metrics });

  // ── 12. Circuit breakers ──────────────────
  const breakers = new CircuitBreakerRegistry();
  breakers.get('openai', { failureThreshold: 5, timeout: 30000 });
  breakers.get('anthropic', { failureThreshold: 5, timeout: 30000 });
  breakers.get('deepseek', { failureThreshold: 5, timeout: 30000 });

  // ── 13. Queues ────────────────────────────
  let redisConfig = null;
  if (process.env.REDIS_URL) {
    try {
      const url = new URL(process.env.REDIS_URL);
      redisConfig = { host: url.hostname, port: Number(url.port) || 6379, password: url.password || undefined };
    } catch (_) {}
  }
  const queues = new QueueManager({ logger, redisConfig });

  // ── 14. Backup service ────────────────────
  const backup = new BackupService({
    dbPath: options.dbPath,
    backupDir: options.backupDir,
    maxBackups: options.maxBackups || 14,
    intervalMs: options.backupIntervalMs || 24 * 60 * 60 * 1000,
    logger,
  });
  if (options.startBackups !== false && options.dbPath) {
    backup.startAuto();
  }

  // ── 14b. Local LLM (off by default, activates when hardware ready) ──
  const localLLM = new LocalLLM({
    logger: logger.child('local-llm'),
    events,
    cache,
    enabled: options.localLLMEnabled ?? (process.env.LOCAL_LLM_ENABLED === 'true'),
    baseUrl: options.localLLMUrl || process.env.LOCAL_LLM_URL,
    backend: options.localLLMBackend || process.env.LOCAL_LLM_BACKEND,
    defaultModel: options.localLLMModel || process.env.LOCAL_LLM_MODEL,
  });
  // Kick off a non-blocking health check
  localLLM.checkHealth().catch(() => {});

  // ── 14c. Security hardening (CSRF, tiered limits, headers) ──
  const csrf = new CSRFProtection({
    secret: options.jwtSecret || process.env.JWT_SECRET,
  });

  const rateLimiter = new TieredRateLimiter({
    cache,
    logger: logger.child('ratelimit'),
    events,
  });

  // ── 14d. Observability (Sentry + PostHog, real wiring) ──
  const observability = new Observability({
    logger: logger.child('observability'),
    events,
    release: options.release || process.env.APP_VERSION,
    environment: process.env.NODE_ENV,
  });

  // ── 15. Smart AI call ─────────────────────
  async function smartCall(params) {
    const cacheable = params.cacheable !== false && !params.stream;
    const cacheKey = ['ai', params.task || 'auto', params.system || '', params.prompt];

    // Check budget if user provided
    if (params.user_id) {
      const budget = cost.checkBudget(params.user_id, params.tier || 'free');
      if (!budget.allowed) {
        throw Object.assign(new Error('Monthly AI budget exceeded'), { code: 'BUDGET_EXCEEDED' });
      }
    }

    // Cache check
    if (cacheable) {
      const cached = await cache.get(cacheKey);
      if (cached !== null) {
        metrics.increment('ai_calls_cached');
        events.emit(EVENTS.AI_CALL_CACHED, { task: params.task });
        cost.track({
          user_id: params.user_id, tier: params.tier,
          provider: cached.provider, model: cached.model,
          usage: cached.usage, operation: 'chat', cached: true,
        });
        return { ...cached, cached: true };
      }
    }

    const taskType = modelRouter.detectTask(params.prompt, params.task);

    // ── Local LLM routing (transparent, falls back to cloud) ──
    if (localLLM && localLLM.shouldRouteLocal({
      task: taskType,
      tier: params.tier,
      forceLocal: params.forceLocal,
      forceCloud: params.forceCloud,
    })) {
      const localTimer = metrics.startTimer('ai_call_duration', { provider: 'local' });
      try {
        const localResult = await localLLM.complete({
          prompt: params.prompt,
          system: params.system,
          task: taskType,
          json: params.json,
          max_tokens: params.max_tokens || 2048,
          history: params.history || [],
        });
        const localDuration = localTimer();

        const standardizedLocal = contracts.makeAIResult({
          output: localResult.output,
          model: localResult.model,
          provider: 'local',
          task_type: taskType,
          duration_ms: localDuration,
          usage: localResult.usage,
        });

        metrics.increment('ai_calls_success', 1, { provider: 'local' });
        events.emit(EVENTS.AI_CALL_DONE, {
          provider: 'local', model: localResult.model,
          duration_ms: localDuration, user_id: params.user_id, task_type: taskType,
        });

        // Zero cost — still track for analytics
        cost.track({
          user_id: params.user_id, tier: params.tier,
          provider: 'local', model: localResult.model,
          usage: localResult.usage, operation: params.operation || 'chat', cached: false,
        });

        adaptive.record({
          user_id: params.user_id, operation: 'ai_call', task_type: taskType,
          provider: 'local', model: localResult.model, success: true, duration_ms: localDuration,
        });

        if (cacheable) await cache.set(cacheKey, standardizedLocal, params.cacheTTL || 3600);
        return standardizedLocal;
      } catch (localErr) {
        localTimer();
        localLLM.stats.fallbacks++;
        logger.warn('Local LLM failed, falling back to cloud', { err: localErr.message });
        // Fall through to cloud providers below
      }
    }

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

      // Track cost
      cost.track({
        user_id: params.user_id, tier: params.tier,
        provider: result.provider, model: result.model,
        usage: result.usage, operation: params.operation || 'chat', cached: false,
      });

      // Adaptive
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
      metrics.captureError(err, { context: 'smartCall' });
      events.emit(EVENTS.AI_CALL_FAIL, { error: err.message, code: err.code });
      adaptive.record({
        user_id: params.user_id, operation: 'ai_call',
        task_type: taskType, provider: choice.provider, model: choice.model,
        success: false, duration_ms: 0,
      });
      throw err;
    }
  }

  // ── 16. Compound intelligence ─────────────
  const compound = new CompoundIntelligence({
    smartCall, cache, memory, logger: logger.child('compound'),
  });

  // ── 17. Knowledge service (Perplexity-style) ──
  const knowledge = new KnowledgeService({
    smartCall, cache, logger: logger.child('knowledge'), tracer,
  });

  // ── 17a. Repo intelligence (Cursor-level) ──
  const repoIntel = new RepoIntelligence({
    smartCall, cache, logger: logger.child('repo'), events, tracer,
  });

  // ── 17b. Media pipeline (Meshy-level) ──
  const media = new MediaPipeline({
    smartCall, cache, logger: logger.child('media'), events, tracer,
  });

  // ── 17c. Business operations ──
  const business = new BusinessOps({
    smartCall, compound,
    cache, logger: logger.child('business'), events, db,
  });

  // ── 17d. Workspaces (collaboration) ──
  const workspaces = new WorkspacesService(db, {
    events, audit, logger: logger.child('workspaces'),
  });

  // ── 17e. Voice service ──
  const voice = new VoiceService({
    smartCall, cache, logger: logger.child('voice'), events,
  });

  // ── 17g. Community (reputation + marketplace + seasons) ──
  const community = new CommunityService({
    db, events, logger: logger.child('community'),
  });

  // ── 17h. Disaster recovery + cost optimization + PMF analytics ──
  const disasterRecovery = new DisasterRecovery({
    db, backup, logger: logger.child('dr'), events,
    backupDir: options.backupDir || './backups',
  });

  const semanticCache = new SemanticCache({
    cache, logger: logger.child('semantic-cache'), events,
    similarityThreshold: options.semanticThreshold || 0.85,
  });

  const pmf = new PMFAnalytics({
    db, events, logger: logger.child('pmf'),
  });

  // ── 17i. Advanced AI concepts (Documents 6, 12, 16, 18, 24, 26) ──
  const aiTwin = new AITwin({
    db, smartCall, memory, events, logger: logger.child('twin'),
  });

  const memoryFabric = new MemoryFabric({
    db, smartCall, cache, events, logger: logger.child('fabric'),
  });

  const temporalUX = new TemporalUX({
    db, events, logger: logger.child('temporal'),
  });

  // ── 17j. Vector embeddings + notifications ──
  const embeddings = new EmbeddingsService({
    db, openai, cache, events, logger: logger.child('embeddings'),
  });

  const notifications = new NotificationService({
    db, events, logger: logger.child('notif'),
    email: options.emailService || null,
    realtime: null, // wired after RealtimeService starts
  });

  // ── 17k. Real payment flow (Stripe) ──
  const payments = new PaymentsService({
    db, events, logger: logger.child('payments'),
    notifications,
    stripeKey: options.stripeKey || process.env.STRIPE_SECRET_KEY,
    webhookSecret: options.stripeWebhookSecret || process.env.STRIPE_WEBHOOK_SECRET,
    frontendUrl: options.frontendUrl || process.env.FRONTEND_URL,
  });

  // ── 17l. Phase 3 — Predictive · Shadow · Dreamspace · Reality Map ──
  const predictive = new PredictiveExecution({
    db, smartCall, aiTwin, cache, events, logger: logger.child('predictive'),
    enabled: options.predictiveEnabled !== false,
  });

  const shadow = new ShadowMode({
    db, smartCall, aiTwin, memoryFabric, notifications, events,
    logger: logger.child('shadow'),
    enabled: options.shadowEnabled !== false,
  });

  const dreamspace = new Dreamspace({
    db, smartCall, memoryFabric, aiTwin, pmf, events,
    logger: logger.child('dream'),
    enabled: options.dreamspaceEnabled !== false,
  });

  // ── 17m. Project Workspace (aggregates agent_projects/steps/logs) ──
  const projects = new ProjectsService({
    db, events, logger: logger.child('projects'),
  });

  // ── 17n. Endpoint deprecation (measure before removing) ──
  const deprecation = new DeprecationService({
    db, events, logger: logger.child('deprecation'),
  });

  const orchestration = new OrchestrationService({
    db, smartCall, events, logger: logger.child('orchestration'),
  });

  const realityMap = new RealityMap({
    db, aiTwin, memoryFabric, workspaces, community,
    dreamspace, pmf, shadow, predictive, temporalUX,
    logger: logger.child('reality'), events,
  });

  // Start Dreamspace background loop (optional, default on)
  if (options.startDreamspace !== false) {
    try { dreamspace.start(); } catch (_) {}
  }

  // Wire predictive to observe user AI calls
  events.on('ai.call.done', (payload) => {
    if (payload?.user_id) {
      predictive.onUserAction({
        user_id: payload.user_id,
        action: 'ai.call',
        context: { task: payload.task_type, model: payload.model },
      }).catch(() => {});
    }
  });

  // Wire dreamspace activity tracking
  events.on('ai.call.done', (payload) => {
    if (payload?.user_id) dreamspace.markActive(payload.user_id);
  });

  // ── 17f. Secret rotation ──
  const secrets = new SecretRotation(db, {
    audit, events, logger: logger.child('secrets'),
  });
  if (options.startSecretRotation !== false) {
    secrets.startAutoRotation({
      checkIntervalMs: 24 * 60 * 60 * 1000,
      daysBeforeExpiry: 7,
      autoRotateKeys: options.autoRotateKeys || [],
    });
  }

  // ── 18. Orchestrator factory ──────────────
  const createOrchestrator = (graph, opts = {}) => {
    const validation = contracts.validateOrchestrationGraph(graph);
    if (!validation.valid) throw new Error('Invalid graph: ' + validation.errors.join('; '));

    const userEventHandler = opts.onEvent || (() => {});
    const eventHandler = (e) => {
      userEventHandler(e);
      if (e.type === 'orchestration_start') events.emit(EVENTS.ORCH_START, e);
      else if (e.type === 'node_done') events.emit(EVENTS.ORCH_NODE_DONE, e);
      else if (e.type === 'node_error') events.emit(EVENTS.ORCH_NODE_FAIL, e);
      else if (e.type === 'orchestration_complete') events.emit(EVENTS.ORCH_COMPLETE, e);
    };

    return new Orchestrator(graph, {
      openai, anthropic, cache, smartCall,
      onEvent: eventHandler, userId: opts.userId,
      maxRetries: opts.maxRetries, timeout: opts.timeout,
    });
  };

  // ── 19. Agent runner ──────────────────────
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

  // ── 20. Register workers ──────────────────
  if (options.startWorkers !== false) {
    registerWorkers(queues, { logger, openai, smartCall, memory, events });
  }

  // ── 21. Health monitor (last) ─────────────
  const servicesObj = {
    logger, cache, memory, queues, metrics, breakers,
    events, tracer, adaptive, contracts, audit, rbac, protection,
    cost, backup, knowledge,
    repoIntel, media, business, workspaces, voice, secrets, community,
    disasterRecovery, semanticCache, pmf,
    aiTwin, memoryFabric, temporalUX,
    embeddings, notifications, payments,
    predictive, shadow, dreamspace, realityMap, projects, orchestration, deprecation,
    localLLM,
    csrf, rateLimiter, observability,
    validation, securityHeaders,
    router: modelRouter, security, sse, agents,
    openai, anthropic,
    Orchestrator, createOrchestrator, smartCall, compound, runAgent,
    EVENTS, AUDIT_ACTIONS, ROLES, PERMISSIONS,
    WS_ROLES, WS_PERMS, MEDIA_PROVIDERS,
  };

  const healthMonitor = new HealthMonitor({ services: servicesObj, logger, events });
  if (options.startHealthMonitor !== false) healthMonitor.start();
  servicesObj.healthMonitor = healthMonitor;

  logger.info('Production stack ready', {
    cache: cache.redis ? 'redis+memory' : 'memory-only',
    queues: queues.useBullMQ ? 'BullMQ' : 'in-process',
    providers: Object.fromEntries(Object.entries(modelRouter.PROVIDERS).map(([k, v]) => [k, v.available])),
    backup: backup.timer ? 'auto' : 'manual',
    health_monitor: healthMonitor.timer ? 'active' : 'inactive',
    audit: 'ready', protection: 'ready', cost_tracking: 'ready',
    repo_intel: 'ready', media: 'ready', business: 'ready',
    workspaces: 'ready', voice: 'ready',
    secrets: secrets._rotationTimer ? 'auto-rotation' : 'manual',
  });

  return servicesObj;
}

module.exports = {
  initServices,
  SmartCache, Logger, MemoryService,
  Orchestrator, QueueManager, CompoundIntelligence,
  EventBus, EVENTS, ExecutionTracer, AdaptiveService,
  KnowledgeService, BackupService, CostOptimizer, HealthMonitor,
  AuditLogger, AUDIT_ACTIONS, ProtectionService,
  RBAC, ROLES, PERMISSIONS,
  RepoIntelligence, MediaPipeline, BusinessOps,
  WorkspacesService, VoiceService, SecretRotation,
  CommunityService,
  DisasterRecovery, SemanticCache, PMFAnalytics,
  AITwin, MemoryFabric, TemporalUX,
  EmbeddingsService, NotificationService, PaymentsService,
  PredictiveExecution, ShadowMode, Dreamspace, RealityMap, ProjectsService,
  OrchestrationService, DeprecationService,
  LocalLLM,
  CSRFProtection, TieredRateLimiter, Observability,
  contracts,
};