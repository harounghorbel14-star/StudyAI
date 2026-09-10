// ============================================================
// 📊 services/pmf-analytics.js — Real User Behavior Tracking
// Retention · session quality · feature adoption · friction detection
// Designed for honest PMF discovery (Document 15)
// ============================================================

class PMFAnalytics {
  constructor(options) {
    this.db = options.db;
    this.events = options.events;
    this.logger = options.logger;
    this.initSchema();
  }

  initSchema() {
    if (!this.db) return;

    this.db.prepare(`CREATE TABLE IF NOT EXISTS pmf_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      session_id TEXT,
      event_type TEXT NOT NULL,
      feature TEXT,
      action TEXT,
      success INTEGER DEFAULT 1,
      duration_ms INTEGER,
      metadata TEXT,
      created_at INTEGER NOT NULL
    )`).run();

    this.db.prepare(`CREATE TABLE IF NOT EXISTS pmf_sessions (
      session_id TEXT PRIMARY KEY,
      user_id INTEGER,
      started_at INTEGER NOT NULL,
      last_activity INTEGER NOT NULL,
      duration_ms INTEGER DEFAULT 0,
      events_count INTEGER DEFAULT 0,
      features_used TEXT DEFAULT '[]',
      goal TEXT,
      completed INTEGER DEFAULT 0
    )`).run();

    this.db.prepare(`CREATE TABLE IF NOT EXISTS pmf_cohorts (
      user_id INTEGER PRIMARY KEY,
      signup_date TEXT NOT NULL,
      goal TEXT,
      first_action TEXT,
      first_action_at INTEGER,
      time_to_value_ms INTEGER,
      day_1_active INTEGER DEFAULT 0,
      day_7_active INTEGER DEFAULT 0,
      day_30_active INTEGER DEFAULT 0,
      churned INTEGER DEFAULT 0
    )`).run();

    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_pmf_user ON pmf_events(user_id, created_at)`).run();
    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_pmf_feature ON pmf_events(feature, created_at)`).run();
  }

  // ─── Event tracking ───────────────────────
  track({ user_id, session_id, event_type, feature, action, success = true, duration_ms, metadata = {} }) {
    try {
      this.db.prepare(`INSERT INTO pmf_events (user_id, session_id, event_type, feature, action, success, duration_ms, metadata, created_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(user_id || null, session_id || null, event_type, feature || null, action || null,
             success ? 1 : 0, duration_ms || null, JSON.stringify(metadata), Date.now());

      if (session_id) this._updateSession(session_id, user_id, feature);
    } catch (_) {}
  }

  // ─── Session tracking ─────────────────────
  startSession({ user_id, session_id, goal }) {
    const now = Date.now();
    try {
      this.db.prepare(`INSERT OR REPLACE INTO pmf_sessions (session_id, user_id, started_at, last_activity, goal)
                       VALUES (?, ?, ?, ?, ?)`)
        .run(session_id, user_id || null, now, now, goal || null);
    } catch (_) {}
  }

  _updateSession(session_id, user_id, feature) {
    try {
      const session = this.db.prepare(`SELECT features_used, events_count, started_at FROM pmf_sessions WHERE session_id = ?`).get(session_id);
      if (!session) {
        this.startSession({ user_id, session_id });
        return;
      }
      const features = JSON.parse(session.features_used || '[]');
      if (feature && !features.includes(feature)) features.push(feature);
      const now = Date.now();
      this.db.prepare(`UPDATE pmf_sessions SET last_activity = ?, duration_ms = ?, events_count = events_count + 1, features_used = ? WHERE session_id = ?`)
        .run(now, now - session.started_at, JSON.stringify(features), session_id);
    } catch (_) {}
  }

  endSession({ session_id, completed = true }) {
    try {
      this.db.prepare(`UPDATE pmf_sessions SET completed = ?, last_activity = ? WHERE session_id = ?`)
        .run(completed ? 1 : 0, Date.now(), session_id);
    } catch (_) {}
  }

  // ─── Cohort tracking (signup → activation → retention) ──
  recordSignup({ user_id, goal }) {
    const today = new Date().toISOString().slice(0, 10);
    try {
      this.db.prepare(`INSERT OR IGNORE INTO pmf_cohorts (user_id, signup_date, goal) VALUES (?, ?, ?)`)
        .run(user_id, today, goal || null);
    } catch (_) {}
  }

  recordFirstAction({ user_id, action }) {
    try {
      const cohort = this.db.prepare(`SELECT signup_date, first_action_at FROM pmf_cohorts WHERE user_id = ?`).get(user_id);
      if (cohort && !cohort.first_action_at) {
        const signup = new Date(cohort.signup_date + 'T00:00:00').getTime();
        const now = Date.now();
        this.db.prepare(`UPDATE pmf_cohorts SET first_action = ?, first_action_at = ?, time_to_value_ms = ? WHERE user_id = ?`)
          .run(action, now, now - signup, user_id);
      }
    } catch (_) {}
  }

  // ─── Compute retention metrics ────────────
  getRetention({ period_days = 30 } = {}) {
    try {
      const since = Date.now() - period_days * 24 * 60 * 60 * 1000;
      const sinceDay = new Date(since).toISOString().slice(0, 10);

      const totalSignups = this.db.prepare(`SELECT COUNT(*) as c FROM pmf_cohorts WHERE signup_date >= ?`).get(sinceDay)?.c || 0;
      const activatedUsers = this.db.prepare(`SELECT COUNT(*) as c FROM pmf_cohorts WHERE signup_date >= ? AND first_action_at IS NOT NULL`).get(sinceDay)?.c || 0;

      // Active users last 24h
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const dau = this.db.prepare(`SELECT COUNT(DISTINCT user_id) as c FROM pmf_events WHERE user_id IS NOT NULL AND created_at >= ?`).get(dayAgo)?.c || 0;

      // Active last 7 days
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const wau = this.db.prepare(`SELECT COUNT(DISTINCT user_id) as c FROM pmf_events WHERE user_id IS NOT NULL AND created_at >= ?`).get(weekAgo)?.c || 0;

      return {
        period_days,
        signups: totalSignups,
        activated: activatedUsers,
        activation_rate: totalSignups > 0 ? activatedUsers / totalSignups : 0,
        dau,
        wau,
        stickiness: wau > 0 ? dau / wau : 0,
      };
    } catch (_) {
      return { period_days, error: 'no data yet' };
    }
  }

  // ─── Feature adoption ─────────────────────
  getFeatureAdoption({ period_days = 30 } = {}) {
    try {
      const since = Date.now() - period_days * 24 * 60 * 60 * 1000;
      return this.db.prepare(`
        SELECT feature, COUNT(*) as uses, COUNT(DISTINCT user_id) as unique_users, AVG(success) as success_rate
        FROM pmf_events
        WHERE feature IS NOT NULL AND created_at >= ?
        GROUP BY feature
        ORDER BY uses DESC
      `).all(since);
    } catch (_) { return []; }
  }

  // ─── Friction detection ───────────────────
  getFrictionPoints({ period_days = 7, min_failures = 5 } = {}) {
    try {
      const since = Date.now() - period_days * 24 * 60 * 60 * 1000;
      return this.db.prepare(`
        SELECT feature, action, COUNT(*) as failures
        FROM pmf_events
        WHERE success = 0 AND created_at >= ?
        GROUP BY feature, action
        HAVING failures >= ?
        ORDER BY failures DESC
        LIMIT 20
      `).all(since, min_failures);
    } catch (_) { return []; }
  }

  // ─── Session quality summary ──────────────
  getSessionQuality({ period_days = 7 } = {}) {
    try {
      const since = Date.now() - period_days * 24 * 60 * 60 * 1000;
      const sessions = this.db.prepare(`SELECT duration_ms, events_count, completed, features_used FROM pmf_sessions WHERE started_at >= ?`).all(since);
      if (!sessions.length) return { sessions: 0 };

      const avgDuration = sessions.reduce((s, x) => s + (x.duration_ms || 0), 0) / sessions.length;
      const avgEvents = sessions.reduce((s, x) => s + (x.events_count || 0), 0) / sessions.length;
      const completionRate = sessions.filter(x => x.completed).length / sessions.length;
      const multiFeature = sessions.filter(x => {
        try { return JSON.parse(x.features_used).length > 1; } catch (_) { return false; }
      }).length;

      return {
        sessions: sessions.length,
        avg_duration_seconds: Math.round(avgDuration / 1000),
        avg_events_per_session: Math.round(avgEvents * 10) / 10,
        completion_rate: completionRate,
        multi_feature_sessions: multiFeature,
        engagement_score: completionRate * 0.5 + (multiFeature / sessions.length) * 0.5,
      };
    } catch (_) { return { sessions: 0 }; }
  }

  // ─── Top funnels (action sequences) ───────
  getActivationFunnel() {
    try {
      const onboarded = this.db.prepare(`SELECT COUNT(DISTINCT user_id) as c FROM pmf_events WHERE event_type = 'onboarding.complete'`).get()?.c || 0;
      const firstWorkflow = this.db.prepare(`SELECT COUNT(DISTINCT user_id) as c FROM pmf_events WHERE event_type = 'workflow.run' OR event_type = 'ai.call'`).get()?.c || 0;
      const created = this.db.prepare(`SELECT COUNT(DISTINCT user_id) as c FROM pmf_events WHERE event_type = 'workspace.create' OR event_type = 'project.create'`).get()?.c || 0;
      const shared = this.db.prepare(`SELECT COUNT(DISTINCT user_id) as c FROM pmf_events WHERE event_type = 'share.create'`).get()?.c || 0;

      return {
        steps: [
          { name: 'Onboarded', users: onboarded },
          { name: 'First AI action', users: firstWorkflow },
          { name: 'Created resource', users: created },
          { name: 'Shared', users: shared },
        ],
      };
    } catch (_) { return { steps: [] }; }
  }
}

module.exports = { PMFAnalytics };