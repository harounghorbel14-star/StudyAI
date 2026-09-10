// ============================================================
// 🏆 services/community.js — Reputation · Marketplace · Seasons
// Long-term engagement engine. Single service for all 3 systems
// to keep architecture cohesive.
// ============================================================

const SEASONS = [
  { month: 1,  id: 'coding-arena',     name: 'Elite Coding Arena',          theme: 'Best coding workflows, automations, dev tools' },
  { month: 2,  id: 'startup-builder',  name: 'Startup Builder Month',       theme: 'Build, launch, grow with NexusAI' },
  { month: 3,  id: 'creative-uni',     name: 'AI Creative Universe',        theme: 'Best AI images, dashboards, visual systems' },
  { month: 4,  id: 'video-evolution',  name: 'AI Video Evolution',          theme: 'Best cinematic AI video & storytelling' },
  { month: 5,  id: 'productivity',     name: 'Productivity Mastery',        theme: 'Focus systems, learning, organization' },
  { month: 6,  id: 'build-hackathon',  name: 'Build With Nexus Hackathon',  theme: 'Plugins, automations, workflow chains' },
  { month: 7,  id: 'growth-wars',      name: 'Growth & Marketing Wars',     theme: 'Launch strategies, AI marketing, growth' },
  { month: 8,  id: 'learning',         name: 'Learning Evolution',          theme: 'AI study systems, educational workflows' },
  { month: 9,  id: 'creator',          name: 'Creator Ecosystem',           theme: 'Content pipelines, creator workflows' },
  { month: 10, id: 'design',           name: 'Operational Design Champ',    theme: 'Dashboards, workflow UX, interfaces' },
  { month: 11, id: 'mega-missions',    name: 'Community Mega Missions',     theme: 'Collaborative ecosystem missions' },
  { month: 12, id: 'awards',           name: 'Elite Nexus Awards',          theme: 'Annual ecosystem awards' },
];

const REPUTATION_RANKS = [
  { min: 0,    name: 'Operator',          color: '#7a7a9a' },
  { min: 100,  name: 'Builder',           color: '#5b8def' },
  { min: 500,  name: 'Strategist',        color: '#35f1c6' },
  { min: 2000, name: 'Architect',         color: '#c6f135' },
  { min: 5000, name: 'Elite Operator',    color: '#f59e0b' },
  { min: 15000,name: 'Legendary',         color: '#ef4444' },
];

class CommunityService {
  constructor(options) {
    this.db = options.db;
    this.events = options.events;
    this.logger = options.logger;
    this.initSchema();
  }

  initSchema() {
    if (!this.db) return;

    this.db.prepare(`CREATE TABLE IF NOT EXISTS reputation (
      user_id INTEGER PRIMARY KEY,
      points INTEGER DEFAULT 0,
      lifetime_points INTEGER DEFAULT 0,
      workflows_shared INTEGER DEFAULT 0,
      seasons_won INTEGER DEFAULT 0,
      last_updated INTEGER NOT NULL
    )`).run();

    this.db.prepare(`CREATE TABLE IF NOT EXISTS reputation_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      kind TEXT NOT NULL,
      points INTEGER NOT NULL,
      reason TEXT,
      metadata TEXT,
      created_at INTEGER NOT NULL
    )`).run();

    this.db.prepare(`CREATE TABLE IF NOT EXISTS marketplace_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      owner_id INTEGER NOT NULL,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      content TEXT NOT NULL,
      tags TEXT,
      price_credits INTEGER DEFAULT 0,
      visibility TEXT DEFAULT 'public',
      installs INTEGER DEFAULT 0,
      stars INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`).run();

    this.db.prepare(`CREATE TABLE IF NOT EXISTS marketplace_stars (
      user_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, item_id)
    )`).run();

    this.db.prepare(`CREATE TABLE IF NOT EXISTS marketplace_installs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      installed_at INTEGER NOT NULL
    )`).run();

    this.db.prepare(`CREATE TABLE IF NOT EXISTS season_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      season_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      content TEXT NOT NULL,
      votes INTEGER DEFAULT 0,
      score INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    )`).run();
  }

  // ─── REPUTATION ────────────────────────────────
  award({ user_id, kind, points, reason, metadata }) {
    const now = Date.now();
    this.db.prepare(`INSERT INTO reputation_events (user_id, kind, points, reason, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(user_id, kind, points, reason || '', JSON.stringify(metadata || {}), now);

    // Upsert reputation
    const existing = this.db.prepare(`SELECT user_id FROM reputation WHERE user_id = ?`).get(user_id);
    if (existing) {
      this.db.prepare(`UPDATE reputation SET points = points + ?, lifetime_points = lifetime_points + ?, last_updated = ? WHERE user_id = ?`)
        .run(points, Math.max(0, points), now, user_id);
    } else {
      this.db.prepare(`INSERT INTO reputation (user_id, points, lifetime_points, last_updated) VALUES (?, ?, ?, ?)`)
        .run(user_id, points, Math.max(0, points), now);
    }

    this.events?.emit('reputation.awarded', { user_id, points, kind, reason });
    return this.getReputation(user_id);
  }

  getReputation(user_id) {
    const row = this.db.prepare(`SELECT * FROM reputation WHERE user_id = ?`).get(user_id);
    if (!row) return { user_id, points: 0, lifetime_points: 0, rank: REPUTATION_RANKS[0] };
    const rank = [...REPUTATION_RANKS].reverse().find(r => row.points >= r.min) || REPUTATION_RANKS[0];
    return { ...row, rank };
  }

  leaderboard({ limit = 50 } = {}) {
    return this.db.prepare(`SELECT user_id, points, lifetime_points, workflows_shared, seasons_won FROM reputation ORDER BY points DESC LIMIT ?`)
      .all(limit)
      .map(r => ({ ...r, rank: [...REPUTATION_RANKS].reverse().find(rk => r.points >= rk.min) }));
  }

  // ─── MARKETPLACE ───────────────────────────────
  publishItem({ owner_id, kind, title, description, content, tags = [], price_credits = 0, visibility = 'public' }) {
    if (!['workflow', 'template', 'agent', 'orchestration', 'prompt-pack'].includes(kind)) {
      throw new Error('Invalid kind: ' + kind);
    }
    const slug = this._slugify(title) + '-' + Math.random().toString(36).slice(2, 6);
    const now = Date.now();
    const r = this.db.prepare(`INSERT INTO marketplace_items (slug, owner_id, kind, title, description, content, tags, price_credits, visibility, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(slug, owner_id, kind, title, description || '', JSON.stringify(content), JSON.stringify(tags), price_credits, visibility, now, now);

    // Award reputation
    this.award({ user_id: owner_id, kind: 'marketplace.publish', points: 25, reason: `Published ${kind}: ${title}` });
    this.db.prepare(`UPDATE reputation SET workflows_shared = workflows_shared + 1 WHERE user_id = ?`).run(owner_id);

    this.events?.emit('marketplace.published', { item_id: r.lastInsertRowid, owner_id, kind });
    return { id: r.lastInsertRowid, slug };
  }

  listMarketplace({ kind, tag, sort = 'popular', limit = 30 } = {}) {
    let sql = `SELECT id, slug, owner_id, kind, title, description, tags, price_credits, installs, stars, created_at FROM marketplace_items WHERE visibility = 'public'`;
    const params = [];
    if (kind) { sql += ` AND kind = ?`; params.push(kind); }
    if (tag)  { sql += ` AND tags LIKE ?`; params.push(`%"${tag}"%`); }
    const orderMap = {
      popular: 'installs DESC',
      newest: 'created_at DESC',
      stars: 'stars DESC',
    };
    sql += ` ORDER BY ${orderMap[sort] || orderMap.popular} LIMIT ?`;
    params.push(limit);
    return this.db.prepare(sql).all(...params).map(r => ({
      ...r,
      tags: this._safe(r.tags) || [],
    }));
  }

  installItem({ user_id, item_id }) {
    const item = this.db.prepare(
      `SELECT id, owner_id, content, price_credits, visibility FROM marketplace_items WHERE id = ?`
    ).get(item_id);
    if (!item) throw new Error('item not found');

    // Visibility enforcement: private items are owner-only
    if (item.visibility !== 'public' && item.owner_id !== user_id) {
      throw new Error('forbidden');
    }

    this.db.prepare(`INSERT INTO marketplace_installs (user_id, item_id, installed_at) VALUES (?, ?, ?)`)
      .run(user_id, item_id, Date.now());
    this.db.prepare(`UPDATE marketplace_items SET installs = installs + 1 WHERE id = ?`).run(item_id);

    // Award owner reputation for each install
    if (item.owner_id !== user_id) {
      this.award({ user_id: item.owner_id, kind: 'marketplace.install', points: 5, reason: 'Item installed' });
    }

    this.events?.emit('marketplace.installed', { user_id, item_id });
    return { content: this._safe(item.content) };
  }

  starItem({ user_id, item_id }) {
    const item = this.db.prepare(`SELECT owner_id, visibility FROM marketplace_items WHERE id = ?`).get(item_id);
    if (!item) throw new Error('item not found');
    if (item.visibility !== 'public' && item.owner_id !== user_id) throw new Error('forbidden');
    try {
      this.db.prepare(`INSERT INTO marketplace_stars (user_id, item_id, created_at) VALUES (?, ?, ?)`)
        .run(user_id, item_id, Date.now());
      this.db.prepare(`UPDATE marketplace_items SET stars = stars + 1 WHERE id = ?`).run(item_id);
      return { starred: true };
    } catch (_) {
      // Already starred - unstar
      this.db.prepare(`DELETE FROM marketplace_stars WHERE user_id = ? AND item_id = ?`).run(user_id, item_id);
      this.db.prepare(`UPDATE marketplace_items SET stars = MAX(0, stars - 1) WHERE id = ?`).run(item_id);
      return { starred: false };
    }
  }

  // ─── SEASONS ───────────────────────────────────
  currentSeason() {
    const month = new Date().getMonth() + 1;
    return SEASONS.find(s => s.month === month) || SEASONS[0];
  }

  listSeasons() {
    return SEASONS;
  }

  submitToSeason({ user_id, season_id, title, description, content }) {
    const season = SEASONS.find(s => s.id === season_id);
    if (!season) throw new Error('Unknown season');
    const now = Date.now();
    const r = this.db.prepare(`INSERT INTO season_submissions (user_id, season_id, title, description, content, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(user_id, season_id, title, description || '', JSON.stringify(content), now);
    this.award({ user_id, kind: 'season.submit', points: 50, reason: `Submitted to ${season.name}` });
    return { id: r.lastInsertRowid };
  }

  seasonLeaderboard({ season_id, limit = 20 }) {
    return this.db.prepare(`SELECT id, user_id, title, votes, score, created_at FROM season_submissions WHERE season_id = ? ORDER BY (votes + score) DESC LIMIT ?`)
      .all(season_id, limit);
  }

  voteSeason({ user_id, submission_id }) {
    // Simple: each vote = 1 point
    this.db.prepare(`UPDATE season_submissions SET votes = votes + 1 WHERE id = ?`).run(submission_id);
    const sub = this.db.prepare(`SELECT user_id FROM season_submissions WHERE id = ?`).get(submission_id);
    if (sub && sub.user_id !== user_id) {
      this.award({ user_id: sub.user_id, kind: 'season.vote', points: 2, reason: 'Received vote' });
    }
    return { ok: true };
  }

  // ─── Helpers ───────────────────────────────────
  _slugify(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'item';
  }
  _safe(s) { try { return JSON.parse(s); } catch (_) { return s; } }
}

module.exports = { CommunityService, SEASONS, REPUTATION_RANKS };