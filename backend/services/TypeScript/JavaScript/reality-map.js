// ============================================================
// 🗺️ services/reality-map.js — Operational Reality Map
// Unified snapshot of user's entire operational state:
// workspaces, workflows, memory, health, connections, momentum.
// ============================================================

class RealityMap {
  constructor(options) {
    this.db = options.db;
    this.aiTwin = options.aiTwin;
    this.memoryFabric = options.memoryFabric;
    this.workspaces = options.workspaces;
    this.community = options.community;
    this.dreamspace = options.dreamspace;
    this.pmf = options.pmf;
    this.shadow = options.shadow;
    this.predictive = options.predictive;
    this.temporalUX = options.temporalUX;
    this.logger = options.logger;
    this.events = options.events;
  }

  // ─── Full map snapshot ───────────────────────
  async snapshot(user_id, options = {}) {
    const now = Date.now();
    const snap = {
      user_id,
      generated_at: now,
      version: '1.0',
    };

    // Run all sections in parallel
    const [identity, activity, momentum, systems, insights, connections, temporal] = await Promise.all([
      this._identity(user_id).catch(() => ({})),
      this._activity(user_id).catch(() => ({})),
      this._momentum(user_id).catch(() => ({})),
      this._systems(user_id).catch(() => ({})),
      this._insights(user_id).catch(() => ({})),
      this._connections(user_id).catch(() => ({})),
      this._temporal(user_id).catch(() => ({})),
    ]);

    snap.identity = identity;
    snap.activity = activity;
    snap.momentum = momentum;
    snap.systems = systems;
    snap.insights = insights;
    snap.connections = connections;
    snap.temporal = temporal;
    snap.summary = this._summarize(snap);

    this.events?.emit('reality_map.generated', { user_id });
    return snap;
  }

  // ─── 1. Identity (who the user is) ──────────
  async _identity(user_id) {
    const identity = { user_id };
    try {
      const user = this.db.prepare(`SELECT id, email, name, plan, created_at FROM users WHERE id = ?`).get(user_id);
      if (user) {
        identity.email = user.email;
        identity.name = user.name;
        identity.plan = user.plan;
        identity.member_since_days = Math.floor((Date.now() - user.created_at) / 86400000);
      }
    } catch (_) {}

    // AI Twin identity
    if (this.aiTwin) {
      const twinId = this.aiTwin.getIdentity(user_id);
      identity.twin = twinId;
    }

    // Reputation
    if (this.community) {
      const rep = this.community.getReputation(user_id);
      identity.reputation = {
        points: rep.points,
        rank: rep.rank?.name,
        workflows_shared: rep.workflows_shared || 0,
      };
    }

    return identity;
  }

  // ─── 2. Activity (recent operations) ────────
  async _activity(user_id) {
    const activity = { last_7_days: {}, last_30_days: {} };
    try {
      const day7 = Date.now() - 7 * 86400000;
      const day30 = Date.now() - 30 * 86400000;

      // AI calls (if tracked)
      const events7 = this.db.prepare(
        `SELECT COUNT(*) as c FROM pmf_events WHERE user_id = ? AND created_at >= ?`
      ).get(user_id, day7)?.c || 0;
      const events30 = this.db.prepare(
        `SELECT COUNT(*) as c FROM pmf_events WHERE user_id = ? AND created_at >= ?`
      ).get(user_id, day30)?.c || 0;

      activity.last_7_days.events = events7;
      activity.last_30_days.events = events30;

      // Feature diversity
      const features7 = this.db.prepare(
        `SELECT DISTINCT feature FROM pmf_events WHERE user_id = ? AND created_at >= ? AND feature IS NOT NULL`
      ).all(user_id, day7);
      activity.last_7_days.unique_features = features7.length;
    } catch (_) {}
    return activity;
  }

  // ─── 3. Momentum (are things moving?) ────────
  async _momentum(user_id) {
    const m = {};
    try {
      // Compare last week vs previous week
      const now = Date.now();
      const week1Start = now - 7 * 86400000;
      const week2Start = now - 14 * 86400000;

      const w1 = this.db.prepare(
        `SELECT COUNT(*) as c FROM pmf_events WHERE user_id = ? AND created_at >= ? AND created_at < ?`
      ).get(user_id, week1Start, now)?.c || 0;
      const w2 = this.db.prepare(
        `SELECT COUNT(*) as c FROM pmf_events WHERE user_id = ? AND created_at >= ? AND created_at < ?`
      ).get(user_id, week2Start, week1Start)?.c || 0;

      m.week_current = w1;
      m.week_previous = w2;
      m.trend = w2 > 0 ? (w1 - w2) / w2 : (w1 > 0 ? 1 : 0);
      m.direction = m.trend > 0.1 ? 'accelerating' : m.trend < -0.1 ? 'slowing' : 'steady';

      // Streak: consecutive days with activity
      let streak = 0;
      for (let d = 0; d < 30; d++) {
        const dayStart = now - (d + 1) * 86400000;
        const dayEnd = now - d * 86400000;
        const c = this.db.prepare(
          `SELECT COUNT(*) as c FROM pmf_events WHERE user_id = ? AND created_at >= ? AND created_at < ?`
        ).get(user_id, dayStart, dayEnd)?.c || 0;
        if (c > 0) streak++;
        else break;
      }
      m.active_streak_days = streak;
    } catch (_) {}
    return m;
  }

  // ─── 4. Systems (subsystem health) ──────────
  async _systems(user_id) {
    const systems = {};

    if (this.memoryFabric) {
      const stats = this.memoryFabric.stats(user_id);
      systems.memory_fabric = { nodes: stats.nodes, edges: stats.edges, density: stats.density };
    }

    if (this.dreamspace) {
      const s = this.dreamspace.stats(user_id);
      systems.dreamspace = s;
    }

    if (this.predictive) {
      const s = this.predictive.getStats(user_id);
      systems.predictive = s;
    }

    if (this.shadow) {
      const s = this.shadow.getStats(user_id);
      systems.shadow = s;
    }

    if (this.workspaces) {
      try {
        const list = this.workspaces.listForUser(user_id);
        systems.workspaces = { count: list.length };
      } catch (_) {}
    }

    return systems;
  }

  // ─── 5. Insights (recent generated) ─────────
  async _insights(user_id) {
    const insights = [];

    if (this.dreamspace) {
      const dreamInsights = this.dreamspace.getInsights({ user_id, unseen_only: true, limit: 5 });
      dreamInsights.forEach(i => insights.push({
        source: 'dreamspace',
        kind: i.kind,
        summary: i.summary,
        importance: i.importance,
        created_at: i.created_at,
      }));
    }

    if (this.shadow) {
      const suggestions = this.shadow.list({ user_id, status: 'pending', limit: 5 });
      suggestions.forEach(s => insights.push({
        source: 'shadow',
        kind: s.suggestion_type,
        summary: s.title,
        details: s.body,
        importance: s.confidence,
        created_at: s.created_at,
      }));
    }

    return {
      pending: insights.length,
      items: insights.sort((a, b) => (b.importance || 0) - (a.importance || 0)),
    };
  }

  // ─── 6. Connections (workspaces + collab) ───
  async _connections(user_id) {
    const c = { workspaces: [], collaborators: 0 };
    if (this.workspaces) {
      try {
        const list = this.workspaces.listForUser(user_id) || [];
        c.workspaces = list.slice(0, 10).map(w => ({
          id: w.id, name: w.name, role: w.role,
        }));

        // Count unique collaborators across all workspaces
        const collaboratorSet = new Set();
        list.forEach(ws => {
          try {
            const members = this.workspaces.getMembers?.(ws.id) || [];
            members.forEach(m => { if (m.user_id !== user_id) collaboratorSet.add(m.user_id); });
          } catch (_) {}
        });
        c.collaborators = collaboratorSet.size;
      } catch (_) {}
    }
    return c;
  }

  // ─── 7. Temporal (right-now context) ────────
  async _temporal(user_id) {
    if (!this.temporalUX) return {};
    try {
      const ctx = this.temporalUX.getAdaptiveConfig(user_id);
      return {
        block: ctx.block,
        energy: ctx.energy,
        tone: ctx.tone,
        recommended_mode: ctx.config?.mode,
        pattern: ctx.pattern,
      };
    } catch (_) { return {}; }
  }

  // ─── Summary (human-readable overview) ──────
  _summarize(snap) {
    const s = [];
    if (snap.identity?.plan) s.push(`Plan: ${snap.identity.plan}`);
    if (snap.momentum?.direction) s.push(`Momentum: ${snap.momentum.direction}`);
    if (snap.momentum?.active_streak_days) s.push(`${snap.momentum.active_streak_days}-day streak`);
    if (snap.activity?.last_7_days?.events) s.push(`${snap.activity.last_7_days.events} actions this week`);
    if (snap.insights?.pending) s.push(`${snap.insights.pending} pending insights`);
    if (snap.connections?.collaborators) s.push(`${snap.connections.collaborators} collaborators`);
    return s.join(' · ');
  }
}

module.exports = { RealityMap };