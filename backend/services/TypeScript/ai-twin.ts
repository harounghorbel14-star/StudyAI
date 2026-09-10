// ============================================================
// 🧠 services/ai-twin.ts — AI Operational Twin
// Learns user behaviour patterns and predicts their next action.
// ============================================================
import type { Database, EventBus, Logger, OperationalMode, SmartCall } from '../../types/core';

export type TimeBlockShort = 'night' | 'morning' | 'afternoon' | 'evening';

export interface AITwinOptions {
  db?: Database | null;
  smartCall?: SmartCall | null;
  memory?: unknown;
  events?: EventBus | null;
  logger?: Logger | null;
}

export interface ObserveInput {
  user_id: number;
  action: string;
  context?: Record<string, unknown> | null;
  outcome?: string;
}

export interface Pattern {
  pattern_type: string;
  pattern_data: { action?: string; context?: Record<string, unknown>; outcome?: string } | string;
  confidence: number;
  observations: number;
  last_observed: number;
}

export interface Prediction {
  predicted: string | null;
  confidence: number;
  reasoning?: string;
  based_on_observations?: number;
}

export interface TwinIdentity {
  formed: boolean;
  message?: string;
  total_observations?: number;
  avg_confidence?: number;
  active_time?: string;
  top_actions?: Array<{ action: string; count: number }>;
}

interface PatternRow {
  id: number;
  observations: number;
  confidence: number;
  pattern_type: string;
  pattern_data: string;
  last_observed: number;
}

// Confidence starts low and climbs with repeated observation, but is
// capped below 1 — the twin is never certain about a human.
const INITIAL_CONFIDENCE = 0.3;
const CONFIDENCE_STEP = 0.05;
const MAX_CONFIDENCE = 0.95;

export class AITwin {
  private readonly db: Database | null;
  private readonly smartCall: SmartCall | null;
  private readonly events: EventBus | null;
  private readonly logger: Logger | null;

  constructor(options: AITwinOptions = {}) {
    this.db = options.db ?? null;
    this.smartCall = options.smartCall ?? null;
    this.events = options.events ?? null;
    this.logger = options.logger ?? null;
    this.initSchema();
  }

  private initSchema(): void {
    if (!this.db) return;

    this.db.prepare(`CREATE TABLE IF NOT EXISTS twin_patterns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      pattern_type TEXT NOT NULL,
      pattern_data TEXT NOT NULL,
      confidence REAL DEFAULT 0.5,
      observations INTEGER DEFAULT 1,
      last_observed INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    )`).run();

    this.db.prepare(`CREATE TABLE IF NOT EXISTS twin_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      context TEXT,
      predicted_intent TEXT,
      confidence REAL,
      accepted INTEGER,
      created_at INTEGER NOT NULL
    )`).run();

    this.db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_twin_user ON twin_patterns(user_id, pattern_type)`
    ).run();
  }

  // ─── Pattern key ──────────────────────────
  // Stable across property order and tolerant of malformed context;
  // callers pass whatever they have at the call site.
  patternKey(action: string, context?: Record<string, unknown> | null): string {
    const safe =
      context && typeof context === 'object' && !Array.isArray(context) ? context : {};
    const keys = Object.keys(safe).sort().slice(0, 3).join('_');
    return `${String(action)}::${keys}::${this.timeBlock()}`;
  }

  private timeBlock(at: number = Date.now()): TimeBlockShort {
    const hour = new Date(at).getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  // ─── Observe ──────────────────────────────
  observe({ user_id, action, context = {}, outcome = 'unknown' }: ObserveInput): void {
    if (!this.db) return;
    try {
      const key = this.patternKey(action, context);
      const existing = this.db
        .prepare<PatternRow>(
          `SELECT id, observations, confidence FROM twin_patterns
           WHERE user_id = ? AND pattern_type = ?`
        )
        .get(user_id, key);

      const now = Date.now();
      if (existing) {
        this.db.prepare(
          `UPDATE twin_patterns SET observations = ?, confidence = ?, last_observed = ?
           WHERE id = ?`
        ).run(
          existing.observations + 1,
          Math.min(MAX_CONFIDENCE, existing.confidence + CONFIDENCE_STEP),
          now,
          existing.id
        );
      } else {
        this.db.prepare(
          `INSERT INTO twin_patterns
             (user_id, pattern_type, pattern_data, confidence, observations, last_observed, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(
          user_id, key,
          JSON.stringify({ action, context: context ?? {}, outcome }),
          INITIAL_CONFIDENCE, 1, now, now
        );
      }

      this.events?.emit('twin.observed', { user_id, action });
    } catch (err: unknown) {
      this.logger?.warn('twin observe failed', {
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ─── Read patterns ────────────────────────
  getPatterns(
    userId: number,
    { minConfidence = 0.5, limit = 20 }: { minConfidence?: number; limit?: number } = {}
  ): Pattern[] {
    if (!this.db) return [];
    try {
      return this.db
        .prepare<PatternRow>(
          `SELECT pattern_type, pattern_data, confidence, observations, last_observed
           FROM twin_patterns
           WHERE user_id = ? AND confidence >= ?
           ORDER BY confidence DESC, observations DESC
           LIMIT ?`
        )
        .all(userId, minConfidence, limit)
        .map((row: { pattern_type: any; pattern_data: string; confidence: any; observations: any; last_observed: any; }) => ({
          pattern_type: row.pattern_type,
          pattern_data: this.parse(row.pattern_data),
          confidence: row.confidence,
          observations: row.observations,
          last_observed: row.last_observed,
        }));
    } catch {
      return [];
    }
  }

  // ─── Predict ──────────────────────────────
  async predict({
    user_id,
    current_context,
  }: {
    user_id: number;
    current_context?: Record<string, unknown>;
  }): Promise<Prediction> {
    const patterns = this.getPatterns(user_id, { minConfidence: 0.6 });
    if (patterns.length === 0) return { predicted: null, confidence: 0 };

    const block = this.timeBlock();
    const matching = patterns.filter((p) => p.pattern_type.endsWith(`::${block}`));

    if (matching.length > 0 && this.smartCall) {
      try {
        const result = await this.smartCall<Prediction>({
          prompt:
            `Given these user patterns:\n${JSON.stringify(matching.slice(0, 5), null, 2)}\n\n` +
            `Current context: ${JSON.stringify(current_context ?? {})}\n\n` +
            `Predict the user's most likely next action. ` +
            `Return JSON: { "predicted": string, "confidence": 0-1, "reasoning": string }`,
          task: 'reasoning-fast',
          json: true,
          cacheable: true,
          user_id,
        });

        this.db?.prepare(
          `INSERT INTO twin_actions
             (user_id, action_type, context, predicted_intent, confidence, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).run(
          user_id, 'predict',
          JSON.stringify(current_context ?? {}),
          JSON.stringify(result.output),
          result.output?.confidence ?? 0.5,
          Date.now()
        );

        return result.output;
      } catch {
        // Fall through to the heuristic below.
      }
    }

    const top = matching[0] ?? patterns[0];
    const data = top.pattern_data;
    return {
      predicted: typeof data === 'object' && data ? data.action ?? null : null,
      confidence: top.confidence,
      based_on_observations: top.observations,
    };
  }

  recordFeedback({
    user_id,
    prediction_id,
    accepted,
  }: {
    user_id: number;
    prediction_id: number;
    accepted: boolean;
  }): void {
    try {
      this.db?.prepare(
        `UPDATE twin_actions SET accepted = ? WHERE id = ? AND user_id = ?`
      ).run(accepted ? 1 : 0, prediction_id, user_id);
    } catch {
      // Feedback is best-effort.
    }
  }

  // ─── Identity summary ─────────────────────
  getIdentity(userId: number): TwinIdentity {
    try {
      const patterns = this.getPatterns(userId, { minConfidence: 0.4, limit: 50 });
      if (patterns.length === 0) {
        return { formed: false, message: 'Twin still learning' };
      }

      const timeBlocks: Record<string, number> = {};
      const actions: Record<string, number> = {};

      for (const p of patterns) {
        const parts = p.pattern_type.split('::');
        const block = parts[parts.length - 1] ?? 'unknown';
        const action = parts[0] ?? 'unknown';
        timeBlocks[block] = (timeBlocks[block] ?? 0) + p.observations;
        actions[action] = (actions[action] ?? 0) + p.observations;
      }

      const totalObs = patterns.reduce((sum, p) => sum + p.observations, 0);
      const avgConf = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;

      const busiest = Object.entries(timeBlocks).sort((a, b) => b[1] - a[1])[0];

      return {
        formed: true,
        total_observations: totalObs,
        avg_confidence: Math.round(avgConf * 100) / 100,
        active_time: busiest?.[0] ?? 'unknown',
        top_actions: Object.entries(actions)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([action, count]) => ({ action, count })),
      };
    } catch {
      return { formed: false };
    }
  }

  private parse(value: string): Pattern['pattern_data'] {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  /** Retained for the existing unit tests. */
  _patternKey(action: string, context?: Record<string, unknown> | null): string {
    return this.patternKey(action, context);
  }
}