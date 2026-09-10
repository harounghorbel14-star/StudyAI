// ============================================================
// 📁 services/projects.ts — Project Workspace
//
// Aggregation layer over the tables that already exist:
//   agent_projects · agent_steps · agent_logs
//
// It does not re-implement project creation — /api/agents/orchestrate
// already does that. It adds the three things a workspace needs and
// the codebase lacked: approvals, linked resources, and a single
// assembled view answering:
//
//   1. What is Nexus doing?      → currentStep
//   2. Why?                      → goal + plan
//   3. What is done?             → completed steps
//   4. What needs approval?      → pendingApprovals
//   5. What happens next?        → nextStep
// ============================================================
import type { Database, EventBus, Logger } from '../../types/core';

export type ProjectStatus = 'building' | 'completed' | 'failed' | 'paused' | 'awaiting_approval';
export type StepStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped';
export type ResourceKind = 'file' | 'code' | 'deployment' | 'knowledge' | 'memory' | 'analytics';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

/**
 * How much a project is allowed to do without asking.
 * Ordered — each level includes everything below it.
 */
export type AutonomyLevel = 'suggest' | 'prepare' | 'execute' | 'autonomous';

export const AUTONOMY_RANK: Record<AutonomyLevel, number> = {
  suggest: 0,
  prepare: 1,
  execute: 2,
  autonomous: 3,
};

/**
 * Actions that can destroy work, spend money, or reach production.
 * These require explicit approval below `autonomous`, regardless of
 * how convenient it would be to skip the prompt.
 */
export const DANGEROUS_ACTIONS = [
  'deploy.production',
  'database.migrate',
  'database.drop',
  'resource.delete',
  'payment.charge',
  'secret.rotate',
  'domain.change',
  'email.campaign',
] as const;

export type DangerousAction = typeof DANGEROUS_ACTIONS[number];

export function isDangerous(action: string): boolean {
  return (DANGEROUS_ACTIONS as readonly string[]).includes(action);
}

export interface ProjectsOptions {
  db?: Database | null;
  events?: EventBus | null;
  logger?: Logger | null;
}

export interface ProjectRow {
  id: number;
  user_id: number;
  share_id: string | null;
  name: string;
  idea: string;
  status: ProjectStatus;
  metadata: string;
  created_at: string;
  updated_at: string;
}

export interface StepRow {
  id: number;
  project_id: number;
  agent_name: string;
  step_name: string;
  status: StepStatus;
  input: string | null;
  output: string | null;
  metadata: string;
  duration_ms: number | null;
  created_at: string;
}

export interface Approval {
  id: number;
  project_id: number;
  action: string;
  summary: string;
  payload: Record<string, unknown>;
  risk: 'low' | 'medium' | 'high';
  status: ApprovalStatus;
  requested_by: string;
  created_at: number;
  resolved_at: number | null;
  expires_at: number;
}

export interface Resource {
  id: number;
  project_id: number;
  kind: ResourceKind;
  label: string;
  ref: string;
  metadata: Record<string, unknown>;
  created_at: number;
}

export interface WorkspaceView {
  project: {
    id: number;
    name: string;
    goal: string;
    status: ProjectStatus;
    autonomy: AutonomyLevel;
    share_id: string | null;
    created_at: string;
    updated_at: string;
  };
  /** Ordered plan, derived from the recorded steps. */
  plan: Array<{
    id: number;
    step: string;
    agent: string;
    status: StepStatus;
    duration_ms: number | null;
  }>;
  progress: {
    total: number;
    done: number;
    failed: number;
    running: number;
    pending: number;
    percent: number;
  };
  /** What Nexus is doing right now — null when idle. */
  currentStep: { step: string; agent: string; since: string } | null;
  /** What happens next — null when nothing is queued. */
  nextStep: { step: string; agent: string } | null;
  agents: Array<{ name: string; steps: number; failed: number }>;
  pendingApprovals: Approval[];
  resources: Record<ResourceKind, Resource[]>;
  activity: Array<{ level: string; message: string; agent: string | null; at: string }>;
  blocked: boolean;
}

const APPROVAL_TTL_MS = 24 * 60 * 60 * 1000;
const EMPTY_RESOURCES = (): Record<ResourceKind, Resource[]> => ({
  file: [], code: [], deployment: [], knowledge: [], memory: [], analytics: [],
});

export class ProjectsService {
  private readonly db: Database | null;
  private readonly events: EventBus | null;
  private readonly logger: Logger | null;

  constructor(options: ProjectsOptions = {}) {
    this.db = options.db ?? null;
    this.events = options.events ?? null;
    this.logger = options.logger ?? null;
    this.initSchema();
  }

  // Only the genuinely new tables. agent_projects, agent_steps and
  // agent_logs are owned by routes/agents-system.js.
  private initSchema(): void {
    if (!this.db) return;

    this.db.prepare(`CREATE TABLE IF NOT EXISTS project_approvals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      summary TEXT NOT NULL,
      payload TEXT DEFAULT '{}',
      risk TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'pending',
      requested_by TEXT,
      created_at INTEGER NOT NULL,
      resolved_at INTEGER,
      expires_at INTEGER NOT NULL
    )`).run();

    this.db.prepare(`CREATE TABLE IF NOT EXISTS project_resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      kind TEXT NOT NULL,
      label TEXT NOT NULL,
      ref TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      created_at INTEGER NOT NULL
    )`).run();

    this.db.prepare(`CREATE TABLE IF NOT EXISTS project_settings (
      project_id INTEGER PRIMARY KEY,
      autonomy TEXT DEFAULT 'prepare',
      updated_at INTEGER NOT NULL
    )`).run();

    this.db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_appr_project ON project_approvals(project_id, status)`
    ).run();
    this.db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_res_project ON project_resources(project_id, kind)`
    ).run();
  }

  // ─── Ownership ────────────────────────────
  // Every read and write goes through this, so a project id from a
  // URL can never reach another user's data.
  private owned(projectId: number, userId: number): ProjectRow | null {
    if (!this.db) return null;
    try {
      return this.db
        .prepare<ProjectRow>(`SELECT * FROM agent_projects WHERE id = ? AND user_id = ?`)
        .get(projectId, userId) ?? null;
    } catch {
      return null;
    }
  }

  // ─── The assembled workspace ──────────────
  getWorkspace(projectId: number, userId: number): WorkspaceView | null {
    const project = this.owned(projectId, userId);
    if (!project || !this.db) return null;

    const steps = this.safeAll<StepRow>(
      `SELECT * FROM agent_steps WHERE project_id = ? ORDER BY id ASC`, [projectId]);

    const plan = steps.map((s) => ({
      id: s.id,
      step: s.step_name,
      agent: s.agent_name,
      status: s.status,
      duration_ms: s.duration_ms,
    }));

    const done = steps.filter((s) => s.status === 'done').length;
    const failed = steps.filter((s) => s.status === 'failed').length;
    const running = steps.filter((s) => s.status === 'running').length;
    const pending = steps.filter((s) => s.status === 'pending').length;

    const runningStep = steps.find((s) => s.status === 'running');
    const nextPending = steps.find((s) => s.status === 'pending');

    const pendingApprovals = this.listApprovals(projectId, userId, 'pending');

    // A project is blocked when it cannot advance on its own: either
    // it is waiting on a human, or a step failed and nothing is running.
    const blocked = pendingApprovals.length > 0 || (failed > 0 && running === 0);

    const agentMap = new Map<string, { steps: number; failed: number }>();
    for (const s of steps) {
      const entry = agentMap.get(s.agent_name) ?? { steps: 0, failed: 0 };
      entry.steps++;
      if (s.status === 'failed') entry.failed++;
      agentMap.set(s.agent_name, entry);
    }

    const activity = this.safeAll<{
      level: string; message: string; agent_name: string | null; created_at: string;
    }>(
      `SELECT level, message, agent_name, created_at FROM agent_logs
       WHERE project_id = ? ORDER BY id DESC LIMIT 40`, [projectId]
    ).map((l) => ({
      level: l.level, message: l.message, agent: l.agent_name, at: l.created_at,
    }));

    return {
      project: {
        id: project.id,
        name: project.name,
        goal: project.idea,
        status: pendingApprovals.length > 0 ? 'awaiting_approval' : project.status,
        autonomy: this.getAutonomy(projectId),
        share_id: project.share_id,
        created_at: project.created_at,
        updated_at: project.updated_at,
      },
      plan,
      progress: {
        total: steps.length,
        done, failed, running, pending,
        percent: steps.length ? Math.round((done / steps.length) * 100) : 0,
      },
      currentStep: runningStep
        ? { step: runningStep.step_name, agent: runningStep.agent_name, since: runningStep.created_at }
        : null,
      nextStep: nextPending
        ? { step: nextPending.step_name, agent: nextPending.agent_name }
        : null,
      agents: [...agentMap.entries()].map(([name, v]) => ({ name, ...v })),
      pendingApprovals,
      resources: this.listResources(projectId, userId),
      activity,
      blocked,
    };
  }

  // ─── Project list ─────────────────────────
  list(userId: number, limit = 30): Array<{
    id: number; name: string; goal: string; status: ProjectStatus;
    percent: number; blocked: boolean; updated_at: string;
  }> {
    const rows = this.safeAll<ProjectRow>(
      `SELECT id, name, idea, status, created_at, updated_at
       FROM agent_projects WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?`,
      [userId, limit]
    );

    return rows.map((p) => {
      const counts = this.safeGet<{ total: number; done: number }>(
        `SELECT COUNT(*) as total, SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) as done
         FROM agent_steps WHERE project_id = ?`, [p.id]);
      const total = counts?.total ?? 0;
      const doneCount = counts?.done ?? 0;
      const waiting = this.safeGet<{ c: number }>(
        `SELECT COUNT(*) as c FROM project_approvals WHERE project_id = ? AND status = 'pending'`,
        [p.id])?.c ?? 0;

      return {
        id: p.id,
        name: p.name,
        goal: p.idea,
        status: waiting > 0 ? 'awaiting_approval' : p.status,
        percent: total ? Math.round((doneCount / total) * 100) : 0,
        blocked: waiting > 0,
        updated_at: p.updated_at,
      };
    });
  }

  // ─── Autonomy ─────────────────────────────
  getAutonomy(projectId: number): AutonomyLevel {
    const row = this.safeGet<{ autonomy: string }>(
      `SELECT autonomy FROM project_settings WHERE project_id = ?`, [projectId]);
    const value = row?.autonomy;
    // Default to `prepare`: Nexus does the work but waits before acting.
    return value && value in AUTONOMY_RANK ? (value as AutonomyLevel) : 'prepare';
  }

  setAutonomy(projectId: number, userId: number, level: AutonomyLevel): { ok: boolean } {
    if (!this.owned(projectId, userId)) return { ok: false };
    if (!(level in AUTONOMY_RANK)) return { ok: false };
    try {
      this.db?.prepare(
        `INSERT INTO project_settings (project_id, autonomy, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(project_id) DO UPDATE SET autonomy = excluded.autonomy,
                                               updated_at = excluded.updated_at`
      ).run(projectId, level, Date.now());
      this.events?.emit('project.autonomy_changed', { project_id: projectId, level });
      return { ok: true };
    } catch {
      // Older SQLite builds lack ON CONFLICT on this shape.
      try {
        this.db?.prepare(`UPDATE project_settings SET autonomy = ?, updated_at = ? WHERE project_id = ?`)
          .run(level, Date.now(), projectId);
        this.db?.prepare(`INSERT OR IGNORE INTO project_settings (project_id, autonomy, updated_at) VALUES (?, ?, ?)`)
          .run(projectId, level, Date.now());
        return { ok: true };
      } catch {
        return { ok: false };
      }
    }
  }

  /**
   * Whether an action may run unattended.
   * Dangerous actions always need approval unless the project is
   * explicitly set to `autonomous`.
   */
  canAutoExecute(projectId: number, action: string): boolean {
    const level = this.getAutonomy(projectId);
    if (isDangerous(action)) return level === 'autonomous';
    return AUTONOMY_RANK[level] >= AUTONOMY_RANK.execute;
  }

  // ─── Approvals ────────────────────────────
  requestApproval({
    project_id, user_id, action, summary, payload = {}, risk = 'medium', requested_by = 'nexus',
  }: {
    project_id: number;
    user_id: number;
    action: string;
    summary: string;
    payload?: Record<string, unknown>;
    risk?: 'low' | 'medium' | 'high';
    requested_by?: string;
  }): { id: number } | null {
    if (!this.owned(project_id, user_id) || !this.db) return null;

    const now = Date.now();
    const result = this.db.prepare(
      `INSERT INTO project_approvals
         (project_id, action, summary, payload, risk, status, requested_by, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)`
    ).run(
      project_id, action, summary, JSON.stringify(payload),
      isDangerous(action) ? 'high' : risk,
      requested_by, now, now + APPROVAL_TTL_MS
    );

    this.events?.emit('project.approval_requested', { project_id, action, risk });
    return { id: Number(result.lastInsertRowid) };
  }

  listApprovals(projectId: number, userId: number, status: ApprovalStatus | 'all' = 'pending'): Approval[] {
    if (!this.owned(projectId, userId)) return [];

    let sql = `SELECT * FROM project_approvals WHERE project_id = ?`;
    const params: unknown[] = [projectId];
    if (status !== 'all') {
      sql += ` AND status = ?`;
      params.push(status);
    }
    sql += ` ORDER BY created_at DESC LIMIT 50`;

    const now = Date.now();
    return this.safeAll<Approval & { payload: string }>(sql, params)
      // An expired request is reported as expired rather than silently
      // remaining actionable.
      .map((a) => ({
        ...a,
        status: a.status === 'pending' && a.expires_at < now ? 'expired' : a.status,
        payload: this.parse(a.payload),
      }))
      .filter((a) => status === 'all' || a.status === status);
  }

  resolveApproval({
    approval_id, user_id, decision,
  }: {
    approval_id: number;
    user_id: number;
    decision: 'approved' | 'rejected';
  }): { ok: boolean; reason?: string } {
    if (!this.db) return { ok: false, reason: 'unavailable' };

    const approval = this.safeGet<Approval>(
      `SELECT * FROM project_approvals WHERE id = ?`, [approval_id]);
    if (!approval) return { ok: false, reason: 'not found' };

    // Ownership is checked against the parent project, not the
    // approval row, so a guessed id cannot resolve someone else's gate.
    if (!this.owned(approval.project_id, user_id)) return { ok: false, reason: 'forbidden' };
    if (approval.status !== 'pending') return { ok: false, reason: 'already resolved' };
    if (approval.expires_at < Date.now()) return { ok: false, reason: 'expired' };

    this.db.prepare(
      `UPDATE project_approvals SET status = ?, resolved_at = ? WHERE id = ?`
    ).run(decision, Date.now(), approval_id);

    this.events?.emit('project.approval_resolved', {
      project_id: approval.project_id, action: approval.action, decision,
    });
    return { ok: true };
  }

  // ─── Resources ────────────────────────────
  linkResource({
    project_id, user_id, kind, label, ref, metadata = {},
  }: {
    project_id: number;
    user_id: number;
    kind: ResourceKind;
    label: string;
    ref: string;
    metadata?: Record<string, unknown>;
  }): { id: number } | null {
    if (!this.owned(project_id, user_id) || !this.db) return null;

    const result = this.db.prepare(
      `INSERT INTO project_resources (project_id, kind, label, ref, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(project_id, kind, label, ref, JSON.stringify(metadata), Date.now());

    this.events?.emit('project.resource_linked', { project_id, kind });
    return { id: Number(result.lastInsertRowid) };
  }

  listResources(projectId: number, userId: number): Record<ResourceKind, Resource[]> {
    const grouped = EMPTY_RESOURCES();
    if (!this.owned(projectId, userId)) return grouped;

    for (const r of this.safeAll<Resource & { payload?: string; metadata: string }>(
      `SELECT * FROM project_resources WHERE project_id = ? ORDER BY created_at DESC LIMIT 200`,
      [projectId]
    )) {
      const bucket = grouped[r.kind as ResourceKind];
      if (bucket) bucket.push({ ...r, metadata: this.parse(r.metadata) });
    }
    return grouped;
  }

  unlinkResource(resourceId: number, userId: number): { ok: boolean } {
    const row = this.safeGet<{ project_id: number }>(
      `SELECT project_id FROM project_resources WHERE id = ?`, [resourceId]);
    if (!row || !this.owned(row.project_id, userId)) return { ok: false };
    try {
      this.db?.prepare(`DELETE FROM project_resources WHERE id = ?`).run(resourceId);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  // ─── Helpers ──────────────────────────────
  private safeAll<T>(sql: string, params: unknown[]): T[] {
    try {
      return this.db?.prepare<T>(sql).all(...params) ?? [];
    } catch (err: unknown) {
      this.logger?.warn('projects query failed', {
        err: err instanceof Error ? err.message : String(err),
      });
      return [];
    }
  }

  private safeGet<T>(sql: string, params: unknown[]): T | null {
    try {
      return this.db?.prepare<T>(sql).get(...params) ?? null;
    } catch {
      return null;
    }
  }

  private parse(value: unknown): Record<string, unknown> {
    if (typeof value !== 'string') return (value as Record<string, unknown>) ?? {};
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
}