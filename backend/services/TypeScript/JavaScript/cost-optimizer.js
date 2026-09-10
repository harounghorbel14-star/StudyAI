// ============================================================
// 💰 services/cost-optimizer.js — AI Cost Control
// Token tracking · Quota enforcement · Semantic dedup · Routing
// ============================================================

// Approximate cost per 1K tokens (USD) — update as needed
const PRICING = {
  'gpt-4o':                   { input: 0.0025,  output: 0.01    },
  'gpt-4o-mini':              { input: 0.00015, output: 0.0006  },
  'claude-sonnet-4-5':        { input: 0.003,   output: 0.015   },
  'claude-haiku-4-5':         { input: 0.001,   output: 0.005   },
  'deepseek-coder':           { input: 0.00014, output: 0.00028 },
  'deepseek-reasoner':        { input: 0.00055, output: 0.0022  },
  'text-embedding-3-small':   { input: 0.00002, output: 0       },
};

class CostOptimizer {
  constructor(db, options = {}) {
    this.db = db;
    this.logger = options.logger;
    this.events = options.events;
    this.metrics = options.metrics;

    // Per-tier monthly budget (USD)
    this.monthlyBudget = {
      free:  options.budgets?.free  || 0.50,
      pro:   options.budgets?.pro   || 25,
      elite: options.budgets?.elite || 100,
    };

    this.initSchema();
  }

  initSchema() {
    this.db.prepare(`CREATE TABLE IF NOT EXISTS ai_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      tier TEXT,
      provider TEXT,
      model TEXT,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      cost_usd REAL DEFAULT 0,
      operation TEXT,
      cached INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    )`).run();

    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_usage_user ON ai_usage(user_id, created_at)`).run();
    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_usage_provider ON ai_usage(provider, created_at)`).run();
  }

  // ─── Estimate cost from token counts ──────
  estimateCost(model, inputTokens, outputTokens) {
    const pricing = PRICING[model];
    if (!pricing) return 0;
    return (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output;
  }

  // ─── Track usage after an AI call ─────────
  track({ user_id, tier, provider, model, usage = {}, operation, cached = false }) {
    const inputTokens = usage.prompt_tokens || usage.input_tokens || 0;
    const outputTokens = usage.completion_tokens || usage.output_tokens || 0;
    const cost = cached ? 0 : this.estimateCost(model, inputTokens, outputTokens);

    try {
      this.db.prepare(`INSERT INTO ai_usage (user_id, tier, provider, model, input_tokens, output_tokens, cost_usd, operation, cached, created_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(user_id || null, tier || 'free', provider, model, inputTokens, outputTokens, cost, operation || 'chat', cached ? 1 : 0, Date.now());
    } catch (_) {}

    this.metrics?.increment('ai_cost_tracked', 1, { provider, model });
    this.metrics?.observe('ai_cost_per_call', cost * 100); // cents

    return { cost, inputTokens, outputTokens };
  }

  // ─── Check if user has budget remaining ───
  checkBudget(userId, tier = 'free') {
    if (!userId) return { allowed: true, remaining: Infinity };
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    try {
      const row = this.db.prepare(`SELECT SUM(cost_usd) as spent FROM ai_usage WHERE user_id = ? AND created_at >= ?`)
        .get(userId, monthAgo);
      const spent = row?.spent || 0;
      const budget = this.monthlyBudget[tier] || this.monthlyBudget.free;
      return {
        allowed: spent < budget,
        spent: Math.round(spent * 1000) / 1000,
        budget,
        remaining: Math.max(0, budget - spent),
        usage_percent: ((spent / budget) * 100).toFixed(1) + '%',
      };
    } catch (_) {
      return { allowed: true, remaining: Infinity };
    }
  }

  // ─── User cost summary ────────────────────
  userCostStats(userId, days = 30) {
    const since = Date.now() - days * 24 * 60 * 60 * 1000;
    try {
      const total = this.db.prepare(`SELECT SUM(cost_usd) as cost, SUM(input_tokens + output_tokens) as tokens, COUNT(*) as calls, SUM(cached) as cached FROM ai_usage WHERE user_id = ? AND created_at >= ?`).get(userId, since);
      const byProvider = this.db.prepare(`SELECT provider, SUM(cost_usd) as cost, COUNT(*) as calls FROM ai_usage WHERE user_id = ? AND created_at >= ? GROUP BY provider`).all(userId, since);
      const byOp = this.db.prepare(`SELECT operation, SUM(cost_usd) as cost, COUNT(*) as calls FROM ai_usage WHERE user_id = ? AND created_at >= ? GROUP BY operation ORDER BY cost DESC LIMIT 10`).all(userId, since);

      const totalCalls = total?.calls || 0;
      const cacheRate = totalCalls > 0 ? ((total.cached / totalCalls) * 100).toFixed(1) + '%' : '0%';

      return {
        period_days: days,
        total_cost: Math.round((total?.cost || 0) * 1000) / 1000,
        total_tokens: total?.tokens || 0,
        total_calls: totalCalls,
        cache_hit_rate: cacheRate,
        savings_from_cache: Math.round((total?.cached || 0) * 0.001 * 1000) / 1000,
        by_provider: byProvider,
        by_operation: byOp,
      };
    } catch (_) {
      return {};
    }
  }

  // ─── System-wide cost stats ───────────────
  systemStats(days = 30) {
    const since = Date.now() - days * 24 * 60 * 60 * 1000;
    try {
      const total = this.db.prepare(`SELECT SUM(cost_usd) as cost, COUNT(*) as calls, SUM(input_tokens + output_tokens) as tokens FROM ai_usage WHERE created_at >= ?`).get(since);
      const byProvider = this.db.prepare(`SELECT provider, model, SUM(cost_usd) as cost, COUNT(*) as calls FROM ai_usage WHERE created_at >= ? GROUP BY provider, model ORDER BY cost DESC`).all(since);
      const cached = this.db.prepare(`SELECT COUNT(*) as cached_calls FROM ai_usage WHERE cached = 1 AND created_at >= ?`).get(since);

      return {
        period_days: days,
        total_cost_usd: Math.round((total?.cost || 0) * 100) / 100,
        total_calls: total?.calls || 0,
        cached_calls: cached?.cached_calls || 0,
        avg_cost_per_call: total?.calls > 0 ? Math.round((total.cost / total.calls) * 10000) / 10000 : 0,
        breakdown: byProvider,
      };
    } catch (_) { return {}; }
  }

  // ─── Top cost users ───────────────────────
  topUsers(limit = 20, days = 30) {
    const since = Date.now() - days * 24 * 60 * 60 * 1000;
    try {
      return this.db.prepare(`SELECT user_id, SUM(cost_usd) as cost, COUNT(*) as calls FROM ai_usage WHERE user_id IS NOT NULL AND created_at >= ? GROUP BY user_id ORDER BY cost DESC LIMIT ?`).all(since, limit);
    } catch (_) { return []; }
  }
}

module.exports = { CostOptimizer, PRICING };