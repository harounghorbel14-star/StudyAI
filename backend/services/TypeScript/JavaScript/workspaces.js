// ============================================================
// 👥 services/workspaces.js — Collaborative Workspaces
// Teams, members, shared resources, activity feeds
// ============================================================
const crypto = require('crypto');

const ROLES = Object.freeze({ OWNER: 'owner', ADMIN: 'admin', MEMBER: 'member', VIEWER: 'viewer' });

const PERMISSIONS = {
  [ROLES.OWNER]:  ['read', 'write', 'delete', 'invite', 'manage', 'transfer'],
  [ROLES.ADMIN]:  ['read', 'write', 'delete', 'invite', 'manage'],
  [ROLES.MEMBER]: ['read', 'write'],
  [ROLES.VIEWER]: ['read'],
};

class WorkspacesService {
  constructor(db, options = {}) {
    this.db = db;
    this.events = options.events;
    this.audit = options.audit;
    this.logger = options.logger;
    this.initSchema();
  }

  initSchema() {
    this.db.prepare(`CREATE TABLE IF NOT EXISTS workspaces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      owner_id INTEGER NOT NULL,
      visibility TEXT DEFAULT 'private',
      settings TEXT DEFAULT '{}',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`).run();

    this.db.prepare(`CREATE TABLE IF NOT EXISTS workspace_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at INTEGER NOT NULL,
      UNIQUE(workspace_id, user_id)
    )`).run();

    this.db.prepare(`CREATE TABLE IF NOT EXISTS workspace_invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      token TEXT UNIQUE NOT NULL,
      invited_by INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      accepted_at INTEGER,
      created_at INTEGER NOT NULL
    )`).run();

    this.db.prepare(`CREATE TABLE IF NOT EXISTS workspace_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id INTEGER,
      metadata TEXT,
      created_at INTEGER NOT NULL
    )`).run();

    this.db.prepare(`CREATE TABLE IF NOT EXISTS workspace_resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id INTEGER NOT NULL,
      added_by INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(workspace_id, resource_type, resource_id)
    )`).run();

    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_ws_members ON workspace_members(workspace_id)`).run();
    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_ws_user ON workspace_members(user_id)`).run();
    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_ws_activity ON workspace_activity(workspace_id, created_at)`).run();
  }

  // ─── Create workspace ────────────────────
  create({ owner_id, name, description = '', visibility = 'private' }) {
    const slug = this._slugify(name) + '-' + crypto.randomBytes(3).toString('hex');
    const now = Date.now();

    const result = this.db.prepare(`INSERT INTO workspaces (slug, name, description, owner_id, visibility, created_at, updated_at)
                                    VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(slug, name, description, owner_id, visibility, now, now);

    const wsId = result.lastInsertRowid;

    // Owner is automatically a member
    this.db.prepare(`INSERT INTO workspace_members (workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)`)
      .run(wsId, owner_id, ROLES.OWNER, now);

    this._activity({ workspace_id: wsId, user_id: owner_id, action: 'workspace.created' });
    this.events?.emit('workspace.created', { workspace_id: wsId, owner_id });

    return this.get(wsId);
  }

  get(workspaceId) {
    try {
      const ws = this.db.prepare(`SELECT * FROM workspaces WHERE id = ?`).get(workspaceId);
      if (!ws) return null;
      ws.settings = this._safeParse(ws.settings);
      ws.members = this.listMembers(workspaceId);
      return ws;
    } catch (_) { return null; }
  }

  getBySlug(slug) {
    try {
      const ws = this.db.prepare(`SELECT * FROM workspaces WHERE slug = ?`).get(slug);
      if (!ws) return null;
      return this.get(ws.id);
    } catch (_) { return null; }
  }

  listForUser(userId) {
    try {
      return this.db.prepare(`
        SELECT w.*, m.role, m.joined_at
        FROM workspaces w
        JOIN workspace_members m ON m.workspace_id = w.id
        WHERE m.user_id = ?
        ORDER BY w.updated_at DESC
      `).all(userId).map(w => ({ ...w, settings: this._safeParse(w.settings) }));
    } catch (_) { return []; }
  }

  // ─── Members ─────────────────────────────
  listMembers(workspaceId) {
    try {
      return this.db.prepare(`
        SELECT m.user_id, m.role, m.joined_at, u.email, u.name
        FROM workspace_members m
        LEFT JOIN users u ON u.id = m.user_id
        WHERE m.workspace_id = ?
        ORDER BY m.joined_at ASC
      `).all(workspaceId);
    } catch (_) { return []; }
  }

  getMemberRole(workspaceId, userId) {
    try {
      const m = this.db.prepare(`SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?`)
        .get(workspaceId, userId);
      return m?.role || null;
    } catch (_) { return null; }
  }

  hasPermission(workspaceId, userId, permission) {
    const role = this.getMemberRole(workspaceId, userId);
    if (!role) return false;
    return (PERMISSIONS[role] || []).includes(permission);
  }

  addMember(workspaceId, userId, role = ROLES.MEMBER) {
    try {
      this.db.prepare(`INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)`)
        .run(workspaceId, userId, role, Date.now());
      this._activity({ workspace_id: workspaceId, user_id: userId, action: 'member.added', metadata: { role } });
      this.events?.emit('workspace.member_added', { workspace_id: workspaceId, user_id: userId, role });
      return true;
    } catch (_) { return false; }
  }

  removeMember(workspaceId, userId, removedBy) {
    try {
      const role = this.getMemberRole(workspaceId, userId);
      if (role === ROLES.OWNER) throw new Error('Cannot remove owner');
      this.db.prepare(`DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?`)
        .run(workspaceId, userId);
      this._activity({ workspace_id: workspaceId, user_id: removedBy, action: 'member.removed', target_id: userId });
      return true;
    } catch (_) { return false; }
  }

  updateMemberRole(workspaceId, userId, newRole, updatedBy) {
    if (!ROLES[newRole.toUpperCase()] && !Object.values(ROLES).includes(newRole)) {
      throw new Error('Invalid role');
    }
    try {
      this.db.prepare(`UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND user_id = ?`)
        .run(newRole, workspaceId, userId);
      this._activity({ workspace_id: workspaceId, user_id: updatedBy, action: 'member.role_changed', target_id: userId, metadata: { new_role: newRole } });
      return true;
    } catch (_) { return false; }
  }

  // ─── Invites ─────────────────────────────
  createInvite({ workspace_id, email, role = ROLES.MEMBER, invited_by, ttl_hours = 168 }) {
    const token = crypto.randomBytes(24).toString('hex');
    const expires_at = Date.now() + ttl_hours * 60 * 60 * 1000;

    this.db.prepare(`INSERT INTO workspace_invites (workspace_id, email, role, token, invited_by, expires_at, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(workspace_id, email, role, token, invited_by, expires_at, Date.now());

    this._activity({ workspace_id, user_id: invited_by, action: 'invite.sent', metadata: { email, role } });
    this.events?.emit('workspace.invite_sent', { workspace_id, email });

    return { token, expires_at, invite_url: `/invite/${token}` };
  }

  acceptInvite(token, userId) {
    try {
      const invite = this.db.prepare(`SELECT * FROM workspace_invites WHERE token = ? AND accepted_at IS NULL AND expires_at > ?`)
        .get(token, Date.now());
      if (!invite) return null;

      this.addMember(invite.workspace_id, userId, invite.role);
      this.db.prepare(`UPDATE workspace_invites SET accepted_at = ? WHERE id = ?`).run(Date.now(), invite.id);

      return this.get(invite.workspace_id);
    } catch (_) { return null; }
  }

  // ─── Resources (orchestrations, projects shared) ──
  addResource({ workspace_id, resource_type, resource_id, added_by }) {
    try {
      this.db.prepare(`INSERT OR IGNORE INTO workspace_resources (workspace_id, resource_type, resource_id, added_by, created_at)
                       VALUES (?, ?, ?, ?, ?)`)
        .run(workspace_id, resource_type, resource_id, added_by, Date.now());
      this._activity({ workspace_id, user_id: added_by, action: 'resource.added', target_type: resource_type, target_id: resource_id });
      return true;
    } catch (_) { return false; }
  }

  listResources({ workspace_id, resource_type }) {
    try {
      let sql = `SELECT * FROM workspace_resources WHERE workspace_id = ?`;
      const params = [workspace_id];
      if (resource_type) { sql += ` AND resource_type = ?`; params.push(resource_type); }
      sql += ` ORDER BY created_at DESC`;
      return this.db.prepare(sql).all(...params);
    } catch (_) { return []; }
  }

  // ─── Activity feed ───────────────────────
  _activity({ workspace_id, user_id, action, target_type, target_id, metadata }) {
    try {
      this.db.prepare(`INSERT INTO workspace_activity (workspace_id, user_id, action, target_type, target_id, metadata, created_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(workspace_id, user_id, action, target_type || null, target_id || null, JSON.stringify(metadata || {}), Date.now());
      this.events?.emit('workspace.activity', { workspace_id, user_id, action });
    } catch (_) {}
  }

  getActivity({ workspace_id, limit = 50 }) {
    try {
      return this.db.prepare(`
        SELECT a.*, u.name as user_name, u.email as user_email
        FROM workspace_activity a
        LEFT JOIN users u ON u.id = a.user_id
        WHERE a.workspace_id = ?
        ORDER BY a.created_at DESC
        LIMIT ?
      `).all(workspace_id, limit).map(a => ({ ...a, metadata: this._safeParse(a.metadata) }));
    } catch (_) { return []; }
  }

  // ─── Helpers ─────────────────────────────
  _slugify(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'workspace';
  }

  _safeParse(s) { try { return JSON.parse(s); } catch (_) { return s; } }
}

module.exports = { WorkspacesService, ROLES, PERMISSIONS };