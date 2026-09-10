// ============================================================
// 📊 services/business-ops.js — Autonomous Business Operations
// Analytics interpretation · Growth intelligence · Product lifecycle
// ============================================================

class BusinessOps {
  constructor(options) {
    this.smartCall = options.smartCall;
    this.compound = options.compound;
    this.cache = options.cache;
    this.logger = options.logger;
    this.events = options.events;
    this.db = options.db;

    this.initSchema();
  }

  initSchema() {
    this.db?.prepare(`CREATE TABLE IF NOT EXISTS business_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      project_id INTEGER,
      metric_type TEXT NOT NULL,
      metric_name TEXT NOT NULL,
      value REAL NOT NULL,
      metadata TEXT,
      recorded_at INTEGER NOT NULL
    )`).run();

    this.db?.prepare(`CREATE TABLE IF NOT EXISTS business_insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      project_id INTEGER,
      insight_type TEXT NOT NULL,
      summary TEXT NOT NULL,
      data TEXT,
      severity TEXT DEFAULT 'info',
      acted_on INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    )`).run();

    this.db?.prepare(`CREATE INDEX IF NOT EXISTS idx_metrics_user_proj ON business_metrics(user_id, project_id, recorded_at)`).run();
    this.db?.prepare(`CREATE INDEX IF NOT EXISTS idx_insights_user ON business_insights(user_id, severity, created_at)`).run();
  }

  // ─── Record metric ───────────────────────
  recordMetric({ user_id, project_id, metric_type, metric_name, value, metadata = {} }) {
    try {
      this.db.prepare(`INSERT INTO business_metrics (user_id, project_id, metric_type, metric_name, value, metadata, recorded_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(user_id, project_id || null, metric_type, metric_name, value, JSON.stringify(metadata), Date.now());
    } catch (_) {}
  }

  // ─── Get metrics ─────────────────────────
  getMetrics({ user_id, project_id, metric_type, since, limit = 100 }) {
    try {
      let sql = `SELECT metric_name, value, metadata, recorded_at FROM business_metrics WHERE user_id = ?`;
      const params = [user_id];
      if (project_id) { sql += ` AND project_id = ?`; params.push(project_id); }
      if (metric_type) { sql += ` AND metric_type = ?`; params.push(metric_type); }
      if (since) { sql += ` AND recorded_at >= ?`; params.push(since); }
      sql += ` ORDER BY recorded_at DESC LIMIT ?`;
      params.push(limit);
      return this.db.prepare(sql).all(...params);
    } catch (_) { return []; }
  }

  // ─── Analyze metrics → insights ──────────
  async analyzeMetrics({ user_id, project_id, metric_type, period_days = 7 }) {
    const since = Date.now() - period_days * 24 * 60 * 60 * 1000;
    const metrics = this.getMetrics({ user_id, project_id, metric_type, since, limit: 500 });

    if (!metrics.length) {
      return { insight: 'Not enough data to analyze yet', metrics_count: 0 };
    }

    // Summarize statistically
    const summary = this._summarizeMetrics(metrics);

    // AI interpretation
    const result = await this.smartCall({
      prompt: `Analyze these business metrics and produce actionable insights.

PERIOD: Last ${period_days} days
METRICS COUNT: ${metrics.length}
STATISTICAL SUMMARY:
${JSON.stringify(summary, null, 2)}

RECENT DATA (last 20):
${metrics.slice(0, 20).map(m => `${new Date(m.recorded_at).toISOString().slice(0,10)} | ${m.metric_name}: ${m.value}`).join('\n')}

Return JSON:
{
  "trend": "growing|stable|declining",
  "key_findings": ["..."],
  "anomalies": ["..."],
  "recommendations": [{"action":"...","priority":"high|medium|low","expected_impact":"..."}],
  "next_steps": ["..."],
  "confidence": 0-100
}`,
      task: 'reasoning-deep',
      json: true,
      cacheable: false,
    });

    const insight = result.output;

    // Persist as insight
    this._saveInsight({
      user_id,
      project_id,
      insight_type: 'metrics_analysis',
      summary: insight.key_findings?.[0] || 'Analysis complete',
      data: insight,
      severity: insight.trend === 'declining' ? 'warn' : 'info',
    });

    return { ...insight, metrics_analyzed: metrics.length };
  }

  // ─── Growth intelligence ─────────────────
  async growthIntelligence({ user_id, project_id }) {
    const acquisition = this.getMetrics({ user_id, project_id, metric_type: 'acquisition', limit: 90 });
    const retention = this.getMetrics({ user_id, project_id, metric_type: 'retention', limit: 90 });
    const revenue = this.getMetrics({ user_id, project_id, metric_type: 'revenue', limit: 90 });

    const result = await this.smartCall({
      prompt: `Analyze growth health and recommend strategic actions.

ACQUISITION (signups, traffic, etc):
${JSON.stringify(this._summarizeMetrics(acquisition))}

RETENTION (DAU, MAU, churn):
${JSON.stringify(this._summarizeMetrics(retention))}

REVENUE:
${JSON.stringify(this._summarizeMetrics(revenue))}

Return JSON:
{
  "growth_stage": "pre-pmf|early-pmf|growing|scaling|mature",
  "north_star_metric": "...",
  "biggest_bottleneck": "...",
  "growth_tactics": [{"tactic":"...","why":"...","effort":"low|medium|high","expected_impact":"..."}],
  "warnings": ["..."],
  "30_day_focus": "single most important thing to focus on"
}`,
      task: 'reasoning-deep',
      json: true,
      cacheable: false,
    });

    return result.output;
  }

  // ─── Product lifecycle status ────────────
  async lifecycleStatus({ user_id, project_id }) {
    const metrics = this.getMetrics({ user_id, project_id, limit: 200 });
    const stage = this._inferStage(metrics);

    const playbook = await this.smartCall({
      prompt: `Project is in stage: ${stage}. Generate a focused action playbook.

Metrics summary: ${JSON.stringify(this._summarizeMetrics(metrics))}

Return JSON:
{
  "stage": "${stage}",
  "stage_description": "...",
  "primary_goals": ["3 things to focus on"],
  "what_to_avoid": ["3 things"],
  "milestones_to_unlock_next_stage": ["..."],
  "recommended_actions": [{"action":"...","week":1-4}]
}`,
      task: 'reasoning-deep',
      json: true,
      cacheable: false,
    });

    return playbook.output;
  }

  // ─── Marketing strategy ──────────────────
  async marketingStrategy({ user_id, product, audience, budget = 'low' }) {
    return await this.compound.executeWithConfidence({
      prompt: `Design a focused marketing strategy.

PRODUCT: ${product}
AUDIENCE: ${audience}
BUDGET: ${budget}

Return JSON: {
  "channels": [{"channel":"...","why":"...","weekly_effort_hours":N,"expected_cac":"$X"}],
  "content_themes": ["..."],
  "first_30_days_plan": [{"week":1-4,"focus":"...","tactics":["..."]}],
  "kpis": ["..."],
  "warnings": ["..."]
}`,
      task: 'reasoning-deep',
      json: true,
      criteria: ['actionable', 'specific channels', 'realistic budget'],
      min_score: 75,
    });
  }

  // ─── Get insights ────────────────────────
  getInsights({ user_id, project_id, severity, limit = 50 }) {
    try {
      let sql = `SELECT id, insight_type, summary, data, severity, acted_on, created_at FROM business_insights WHERE user_id = ?`;
      const params = [user_id];
      if (project_id) { sql += ` AND project_id = ?`; params.push(project_id); }
      if (severity) { sql += ` AND severity = ?`; params.push(severity); }
      sql += ` ORDER BY created_at DESC LIMIT ?`;
      params.push(limit);
      return this.db.prepare(sql).all(...params).map(r => ({
        ...r,
        data: this._safeParse(r.data),
      }));
    } catch (_) { return []; }
  }

  markInsightActedOn(insightId, userId) {
    try {
      this.db.prepare(`UPDATE business_insights SET acted_on = 1 WHERE id = ? AND user_id = ?`).run(insightId, userId);
      return true;
    } catch (_) { return false; }
  }

  // ─── Helpers ─────────────────────────────
  _summarizeMetrics(metrics) {
    if (!metrics.length) return { count: 0 };
    const byName = {};
    for (const m of metrics) {
      if (!byName[m.metric_name]) byName[m.metric_name] = [];
      byName[m.metric_name].push(m.value);
    }
    const summary = {};
    for (const [name, values] of Object.entries(byName)) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      summary[name] = {
        count: values.length,
        latest: values[0],
        avg: Number(avg.toFixed(2)),
        min: Math.min(...values),
        max: Math.max(...values),
        trend: this._trend(values),
      };
    }
    return summary;
  }

  _trend(values) {
    if (values.length < 3) return 'insufficient';
    const recent = values.slice(0, Math.floor(values.length / 2));
    const older = values.slice(Math.floor(values.length / 2));
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    const change = ((recentAvg - olderAvg) / olderAvg) * 100;
    if (Math.abs(change) < 5) return 'stable';
    return change > 0 ? 'growing' : 'declining';
  }

  _inferStage(metrics) {
    const summary = this._summarizeMetrics(metrics);
    const totalUsers = summary.signups?.latest || 0;
    const revenue = summary.revenue?.latest || 0;
    if (totalUsers < 100) return 'pre-pmf';
    if (totalUsers < 1000 && revenue < 1000) return 'early-pmf';
    if (revenue < 10000) return 'growing';
    if (revenue < 100000) return 'scaling';
    return 'mature';
  }

  _saveInsight({ user_id, project_id, insight_type, summary, data, severity }) {
    try {
      this.db.prepare(`INSERT INTO business_insights (user_id, project_id, insight_type, summary, data, severity, created_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(user_id, project_id || null, insight_type, summary, JSON.stringify(data), severity || 'info', Date.now());
    } catch (_) {}
  }

  _safeParse(s) { try { return JSON.parse(s); } catch (_) { return s; } }
}

module.exports = { BusinessOps };