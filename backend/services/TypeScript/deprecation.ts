// ============================================================
// 🪦 services/deprecation.ts — Endpoint Deprecation
//
// The audit found ~35 endpoints duplicated across two or three
// mount points. Deleting them outright would break clients we
// cannot see, so each duplicate is marked instead:
//
//   • standard Deprecation / Sunset / Link headers (RFC 8594)
//   • usage is counted, so removal is decided by evidence
//     rather than by assumption
//
// An endpoint with zero calls after its sunset date can be removed
// safely. One that is still being called cannot, whatever the plan
// said.
// ============================================================
import type { Database, EventBus, Logger } from '../../types/core';

export interface DeprecationEntry {
  /** Path prefix being deprecated, e.g. '/api/billing'. */
  path: string;
  /** The endpoint callers should move to. */
  replacement: string;
  /** Why the duplicate exists and which one survives. */
  reason: string;
  /** ISO date after which removal may be considered. */
  sunset: string;
}

/**
 * Every duplicate found in the architecture audit.
 * The surviving endpoint is always the one with the stronger
 * implementation, not simply the older one.
 */
export const DEPRECATED: DeprecationEntry[] = [
  {
    path: '/api/billing',
    replacement: '/api/payments',
    reason: 'Superseded: /api/payments verifies webhook signatures and is idempotent.',
    sunset: '2026-12-31',
  },
  {
    path: '/api/os/memory',
    replacement: '/api/intelligence/memory',
    reason: 'Subset of /api/intelligence/memory, which also exposes the graph.',
    sunset: '2026-12-31',
  },
  {
    path: '/api/os/cache',
    replacement: '/api/core/cache',
    reason: 'Duplicate of /api/core/cache.',
    sunset: '2026-12-31',
  },
  {
    path: '/api/os/jobs',
    replacement: '/api/core/jobs',
    reason: 'Duplicate of /api/core/jobs.',
    sunset: '2026-12-31',
  },
  {
    path: '/api/ux/notifications',
    replacement: '/api/notifications',
    reason: 'Stub. /api/notifications has preferences, channels and delivery.',
    sunset: '2026-12-31',
  },
  {
    path: '/api/admin/audit',
    replacement: '/api/security/audit',
    reason: 'Duplicate. /api/security/audit can verify the tamper-evident chain.',
    sunset: '2026-12-31',
  },
  {
    path: '/api/admin/backups',
    replacement: '/api/dr',
    reason: 'Duplicate. /api/dr can verify backups and run restore tests.',
    sunset: '2026-12-31',
  },
  {
    path: '/api/security/backups',
    replacement: '/api/dr',
    reason: 'Duplicate. /api/dr can verify backups and run restore tests.',
    sunset: '2026-12-31',
  },
  {
    path: '/api/admin/cost',
    replacement: '/api/security/cost',
    reason: 'Cost reporting was split across three mount points.',
    sunset: '2026-12-31',
  },
];

export interface DeprecationOptions {
  db?: Database | null;
  events?: EventBus | null;
  logger?: Logger | null;
  /** Docs base used in the Link header. */
  docsUrl?: string;
}

export interface UsageRow {
  path: string;
  replacement: string;
  calls: number;
  last_called: number | null;
  distinct_users: number;
  sunset: string;
  /** True when nothing has called it and the sunset date has passed. */
  safe_to_remove: boolean;
}

export class DeprecationService {
  private readonly db: Database | null;
  private readonly events: EventBus | null;
  private readonly logger: Logger | null;
  private readonly docsUrl: string;

  /** Sorted longest-first so the most specific prefix wins. */
  private readonly entries: DeprecationEntry[];

  constructor(options: DeprecationOptions = {}) {
    this.db = options.db ?? null;
    this.events = options.events ?? null;
    this.logger = options.logger ?? null;
    this.docsUrl = options.docsUrl ?? 'https://nexusaitools.co/docs/deprecations';

    this.entries = [...DEPRECATED].sort((a, b) => b.path.length - a.path.length);
    this.initSchema();
  }

  private initSchema(): void {
    if (!this.db) return;
    this.db.prepare(`CREATE TABLE IF NOT EXISTS deprecation_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL,
      actual_path TEXT NOT NULL,
      method TEXT,
      user_id INTEGER,
      called_at INTEGER NOT NULL
    )`).run();

    this.db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_dep_path ON deprecation_usage(path, called_at)`
    ).run();
  }

  /** Longest matching prefix, or null when the path is not deprecated. */
  match(requestPath: string): DeprecationEntry | null {
    for (const entry of this.entries) {
      if (requestPath === entry.path || requestPath.startsWith(entry.path + '/')) {
        return entry;
      }
    }
    return null;
  }

  record(entry: DeprecationEntry, actualPath: string, method: string, userId?: number): void {
    if (!this.db) return;
    try {
      this.db.prepare(
        `INSERT INTO deprecation_usage (path, actual_path, method, user_id, called_at)
         VALUES (?, ?, ?, ?, ?)`
      ).run(entry.path, actualPath, method, userId ?? null, Date.now());
    } catch {
      // Measurement must never break the request it is measuring.
    }
  }

  /**
   * Express middleware. Adds the standard headers and counts the call,
   * then lets the request through unchanged — a deprecated endpoint
   * still has to work.
   */
  middleware() {
    return (req: any, res: any, next: () => void): void => {
      const entry = this.match(req.path);
      if (!entry) return next();

      // RFC 8594 and the deprecation-header draft.
      res.setHeader('Deprecation', 'true');
      res.setHeader('Sunset', new Date(entry.sunset).toUTCString());
      res.setHeader('Link', `<${this.docsUrl}>; rel="deprecation"`);
      res.setHeader('X-Replacement-Endpoint', entry.replacement);

      this.record(entry, req.path, req.method, req.user?.id);
      this.events?.emit('deprecation.called', {
        path: entry.path, actual: req.path, user_id: req.user?.id,
      });

      next();
    };
  }

  /**
   * Usage per deprecated path. `safe_to_remove` is only true when the
   * endpoint has had no calls in the window and its sunset has passed.
   */
  report(windowDays = 30): UsageRow[] {
    const since = Date.now() - windowDays * 24 * 60 * 60 * 1000;
    const now = Date.now();

    return DEPRECATED.map((entry) => {
      let calls = 0;
      let lastCalled: number | null = null;
      let distinctUsers = 0;

      if (this.db) {
        try {
          const row = this.db
            .prepare<{ c: number; last: number | null; users: number }>(
              `SELECT COUNT(*) as c, MAX(called_at) as last,
                      COUNT(DISTINCT user_id) as users
               FROM deprecation_usage WHERE path = ? AND called_at >= ?`
            )
            .get(entry.path, since);
          calls = row?.c ?? 0;
          lastCalled = row?.last ?? null;
          distinctUsers = row?.users ?? 0;
        } catch {
          // Fall through with zeroes, but never claim it is safe to
          // remove on the basis of a failed query.
          return {
            path: entry.path,
            replacement: entry.replacement,
            calls: 0,
            last_called: null,
            distinct_users: 0,
            sunset: entry.sunset,
            safe_to_remove: false,
          };
        }
      }

      const sunsetPassed = Date.parse(entry.sunset) < now;
      return {
        path: entry.path,
        replacement: entry.replacement,
        calls,
        last_called: lastCalled,
        distinct_users: distinctUsers,
        sunset: entry.sunset,
        // Evidence, not schedule: still-used endpoints are never safe.
        safe_to_remove: calls === 0 && sunsetPassed && this.db !== null,
      };
    });
  }

  list(): DeprecationEntry[] {
    return [...DEPRECATED];
  }
}