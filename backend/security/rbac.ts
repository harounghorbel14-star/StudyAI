// ============================================================
// 🛂 security/rbac.ts — Role-Based Access Control
// Roles, permissions, and middleware for fine-grained authorization.
//
// Two rules this module enforces without exception:
//   1. Unknown roles and permissions deny access. Never fail open.
//   2. Admin identification is case-insensitive on both sides.
// ============================================================
import type { Logger } from '../types/core';

// ─── Roles ──────────────────────────────────
export const ROLES = {
  GUEST: 'guest',
  USER: 'user',
  PRO: 'pro',
  TEAM: 'team',
  ADMIN: 'admin',
} as const;

export type RoleName = typeof ROLES[keyof typeof ROLES];

// Higher number means broader access. Admin is deliberately far
// above the rest so a new tier can be inserted without renumbering.
export const ROLE_HIERARCHY: Record<RoleName, number> = {
  [ROLES.GUEST]: 0,
  [ROLES.USER]: 1,
  [ROLES.PRO]: 2,
  [ROLES.TEAM]: 3,
  [ROLES.ADMIN]: 99,
};

// ─── Permissions ────────────────────────────
export const PERMISSIONS = {
  AI_GENERATE: 'ai.generate',
  AI_GENERATE_HEAVY: 'ai.generate.heavy',
  ORCHESTRATE: 'orchestrate.run',
  ORCHESTRATE_LARGE: 'orchestrate.run.large',

  DEPLOY_BASIC: 'deploy.basic',
  DEPLOY_FULL: 'deploy.full',
  DEPLOY_TOKENS: 'deploy.tokens.manage',

  WORKSPACE_CREATE: 'workspace.create',
  WORKSPACE_SHARE: 'workspace.share',
  TEAM_INVITE: 'team.invite',

  ADMIN_VIEW_USERS: 'admin.users.view',
  ADMIN_AUDIT_LOG: 'admin.audit.view',
  ADMIN_SYSTEM_HEALTH: 'admin.system.view',
  ADMIN_BACKUP: 'admin.backup',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Permissions granted *at* each level. Lower levels are inherited.
export const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  [ROLES.GUEST]: [],

  [ROLES.USER]: [
    PERMISSIONS.AI_GENERATE,
    PERMISSIONS.ORCHESTRATE,
    PERMISSIONS.WORKSPACE_CREATE,
    PERMISSIONS.DEPLOY_BASIC,
  ],

  [ROLES.PRO]: [
    PERMISSIONS.AI_GENERATE_HEAVY,
    PERMISSIONS.ORCHESTRATE_LARGE,
    PERMISSIONS.DEPLOY_FULL,
    PERMISSIONS.DEPLOY_TOKENS,
    PERMISSIONS.WORKSPACE_SHARE,
  ],

  [ROLES.TEAM]: [
    PERMISSIONS.TEAM_INVITE,
  ],

  [ROLES.ADMIN]: [
    PERMISSIONS.ADMIN_VIEW_USERS,
    PERMISSIONS.ADMIN_AUDIT_LOG,
    PERMISSIONS.ADMIN_SYSTEM_HEALTH,
    PERMISSIONS.ADMIN_BACKUP,
  ],
};

// ─── Types ──────────────────────────────────
export interface AuthUser {
  id?: number | string;
  email?: string;
  plan?: string;
}

export interface AuditLogger {
  log(entry: Record<string, unknown>): void;
}

export interface RBACOptions {
  audit?: AuditLogger | null;
  logger?: Logger | null;
  adminEmails?: string[];
}

interface AuthRequest {
  user?: AuthUser;
  path?: string;
  method?: string;
  ip?: string;
}

interface AuthResponse {
  status(code: number): { json(body: unknown): unknown };
}

type Next = () => void;

function isRoleName(value: string): value is RoleName {
  return value in ROLE_HIERARCHY;
}

export class RBAC {
  private readonly audit: AuditLogger | null;
  private readonly logger: Logger | null;
  readonly adminEmails: string[];

  constructor(options: RBACOptions = {}) {
    this.audit = options.audit ?? null;
    this.logger = options.logger ?? null;

    // Normalise on the way in. Comparing a raw env value against a
    // lowercased address silently denied admin to anyone whose
    // configured email had a capital letter.
    const raw = options.adminEmails ?? (process.env.ADMIN_EMAILS ?? '').split(',');
    this.adminEmails = raw
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }

  // ─── Effective role ───────────────────────
  getRole(user: AuthUser | null | undefined): RoleName {
    if (!user) return ROLES.GUEST;

    if (user.email && this.adminEmails.includes(String(user.email).trim().toLowerCase())) {
      return ROLES.ADMIN;
    }
    if (user.plan === 'team' || user.plan === 'enterprise') return ROLES.TEAM;
    if (user.plan === 'pro' || user.plan === 'elite') return ROLES.PRO;
    return ROLES.USER;
  }

  isAdmin(user: AuthUser | null | undefined): boolean {
    return this.getRole(user) === ROLES.ADMIN;
  }

  // ─── Permissions with inheritance ─────────
  getPermissions(user: AuthUser | null | undefined): Permission[] {
    const role = this.getRole(user);
    const myLevel = ROLE_HIERARCHY[role];
    const all = new Set<Permission>();

    for (const [name, level] of Object.entries(ROLE_HIERARCHY)) {
      if (level <= myLevel) {
        for (const p of ROLE_PERMISSIONS[name as RoleName] ?? []) all.add(p);
      }
    }
    return [...all];
  }

  has(user: AuthUser | null | undefined, permission: string): boolean {
    if (!permission) return false;
    return this.getPermissions(user).includes(permission as Permission);
  }

  // ─── Middleware: require a permission ─────
  require(permission: Permission | string) {
    // Catch a mistyped permission at wiring time rather than
    // silently denying every request at runtime.
    const known = (Object.values(PERMISSIONS) as string[]).includes(permission);
    if (!known) {
      this.logger?.warn('RBAC configured with an unknown permission', { permission });
    }

    return (req: AuthRequest, res: AuthResponse, next: Next): void => {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // An unknown permission denies. Granting on a typo would be
      // a silent privilege escalation.
      if (!known || !this.has(req.user, permission)) {
        this.denied(req, { permission, role: this.getRole(req.user) });
        res.status(403).json({
          error: 'Forbidden',
          required_permission: permission,
          your_role: this.getRole(req.user),
        });
        return;
      }
      next();
    };
  }

  // ─── Middleware: require a minimum role ───
  requireRole(minRole: RoleName | string) {
    const valid = isRoleName(minRole);
    if (!valid) {
      this.logger?.warn('RBAC configured with an unknown role', { role: minRole });
    }
    // Unknown role names resolve to Infinity so nothing can satisfy
    // them. Previously the comparison against `undefined` was always
    // false, which let every caller through.
    const requiredLevel = valid ? ROLE_HIERARCHY[minRole] : Infinity;

    return (req: AuthRequest, res: AuthResponse, next: Next): void => {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const role = this.getRole(req.user);
      if (ROLE_HIERARCHY[role] < requiredLevel) {
        this.denied(req, { required_role: minRole, your_role: role });
        res.status(403).json({
          error: `Forbidden: requires ${minRole} role`,
          your_role: role,
        });
        return;
      }
      next();
    };
  }

  private denied(req: AuthRequest, metadata: Record<string, unknown>): void {
    this.audit?.log({
      user_id: req.user?.id,
      event_type: 'rbac.denied',
      severity: 'warn',
      ip: req.ip,
      resource: req.path,
      action: req.method,
      metadata,
    });
  }
}