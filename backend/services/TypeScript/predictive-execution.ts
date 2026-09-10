// ============================================================
// 🔮 services/predictive-execution.ts — Predictive Execution
// Uses AI Twin patterns to pre-compute a likely next action while
// the user is idle, so the answer is ready before they ask.
// ============================================================
import type { AIResult, Cache, Database, EventBus, Logger, SmartCall } from '../../types/core';
import type { AITwin } from './ai-twin';

export interface PredictiveOptions {
  db?: Database | null;
  smartCall?: SmartCall | null;
  aiTwin?: AITwin | null;
  cache?: Cache | null;
  events?: EventBus | null;
  logger?: Logger | null;
  enabled?: boolean;
  minConfidence?: number;
  maxConcurrent?: number;
}

export interface UserActionInput {
  user_id: number;
  action: string;
  context?: Record<string, unknown>;
}

export interface PredictiveStats {
  predictions_made: number;
  predictions_hit: number;
  hit_rate: number;
  enabled: boolean;
}

export type PredictedResult = AIResult & {
  _predicted: true;
  _confidence: number;
};

interface PredictionRow {
  id: number;
  precomputed_result: string;
  confidence: number;
}

// Every context is truncated before it reaches a prompt. An unbounded
// context would blow the token budget and the cost with it.
const MAX_CONTEXT_CHARS = 500;
const PREDICTION_TTL_MS = 30 * 60 * 1000;
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

type TemplateFn = (context: string) => string;

const PROMPT_TEMPLATES: Record<string, TemplateFn> = {
  'workspace.view': (ctx) =>
    `Summarize likely next steps for a user viewing a workspace with context: ${ctx}`,
  'ai.call': (ctx) =>
    `Given user context ${ctx}, what would be a helpful proactive insight?`,
  'business.analyze': (ctx) =>
    `Suggest 3 growth actions based on: ${ctx}`,
  'code.review': (ctx) =>
    `Common review priorities for code with context: ${ctx}`,
};

export class PredictiveExecution {
  private readonly db: Database | null;
  private readonly smartCall: SmartCall | null;
  private readonly aiTwin: AITwin | null;
  private readonly cache: Cache | null;
  private readonly events: EventBus | null;
  private readonly logger: Logger | null;

  readonly enabled: boolean;
  readonly minConfidence: number;
  readonly maxConcurrent: number;
  private inflight = 0;

  constructor(options: PredictiveOptions = {}) {
    this.db = options.db ?? null;
    this.smartCall = options.smartCall ?? null;
    this.aiTwin = options.aiTwin ?? null;
    this.cache = options.cache ?? null;
    this.events = options.events ?? null;
    this.logger = options.logger ?? null;

    this.enabled = options.enabled !== false;
    this.minConfidence = options.minConfidence ?? 0.7;
    this.maxConcurrent = options.maxConcurrent ?? 2;

    this.initSchema();
  }

  private initSchema(): void {
    if (!this.db) return;

    this.db.prepare(`CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      predicted_action TEXT NOT NULL,
      context TEXT,
      confidence REAL NOT NULL,
      precomputed_result TEXT,
      hit INTEGER DEFAULT 0,
      hit_at INTEGER,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    )`).run();

    this.db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_pred_user ON predictions(user_id, expires_at, hit)`
    ).run();
  }

  // ─── Called after the user completes an action ──
  async onUserAction({ user_id, action, context = {} }: UserActionInput): Promise<void> {
    if (!this.enabled || !this.db) return;
    // Never let speculative work crowd out real requests.
    if (this.inflight >= this.maxConcurrent) return;

    try {
      const prediction = await this.aiTwin?.predict({
        user_id,
        current_context: { last_action: action, ...context },
      });

      if (!prediction?.predicted) return;
      if ((prediction.confidence ?? 0) < this.minConfidence) return;

      // Skip if a fresh prediction for this action already exists.
      const existing = this.db
        .prepare(
          `SELECT id FROM predictions
           WHERE user_id = ? AND predicted_action = ? AND expires_at > ? LIMIT 1`
        )
        .get(user_id, prediction.predicted, Date.now());
      if (existing) return;

      await this.preCompute({
        user_id,
        action: prediction.predicted,
        context,
        confidence: prediction.confidence,
      });
    } catch (err: unknown) {
      this.logger?.warn('predictive onUserAction failed', {
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private async preCompute({
    user_id, action, context, confidence,
  }: {
    user_id: number;
    action: string;
    context: Record<string, unknown>;
    confidence: number;
  }): Promise<void> {
    const prompt = this.buildPromptFor(action, context);
    // An unrecognised action has no safe template; skipping avoids
    // spending a real API call on a guess.
    if (!prompt || !this.smartCall || !this.db) return;

    this.inflight++;
    try {
      const result = await this.smartCall({
        prompt,
        task: 'reasoning-fast',
        cacheable: true,
        cacheTTL: 3600,
        user_id,
        operation: 'predictive_precompute',
      });

      this.db.prepare(
        `INSERT INTO predictions
           (user_id, predicted_action, context, confidence, precomputed_result, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        user_id, action, JSON.stringify(context), confidence,
        JSON.stringify(result), Date.now(), Date.now() + PREDICTION_TTL_MS
      );

      this.events?.emit('predictive.precomputed', { user_id, action, confidence });
    } catch (err: unknown) {
      this.logger?.warn('preCompute failed', {
        err: err instanceof Error ? err.message : String(err),
      });
    } finally {
      this.inflight--;
    }
  }

  private buildPromptFor(action: string, context: Record<string, unknown>): string | null {
    const template = PROMPT_TEMPLATES[action];
    if (!template) return null;

    let serialised: string;
    try {
      serialised = JSON.stringify(context).slice(0, MAX_CONTEXT_CHARS);
    } catch {
      serialised = '{}';
    }
    return template(serialised);
  }

  // ─── Redeem a prediction ──────────────────
  tryHit({ user_id, action }: { user_id: number; action: string }): PredictedResult | null {
    if (!this.db) return null;

    const now = Date.now();
    const row = this.db
      .prepare<PredictionRow>(
        `SELECT id, precomputed_result, confidence FROM predictions
         WHERE user_id = ? AND predicted_action = ? AND expires_at > ? AND hit = 0
         ORDER BY confidence DESC LIMIT 1`
      )
      .get(user_id, action, now);

    if (!row) return null;

    // Mark before returning so a prediction is consumed exactly once.
    this.db.prepare(`UPDATE predictions SET hit = 1, hit_at = ? WHERE id = ?`).run(now, row.id);
    this.events?.emit('predictive.hit', { user_id, action, confidence: row.confidence });

    try {
      const parsed = JSON.parse(row.precomputed_result) as AIResult;
      return { ...parsed, _predicted: true, _confidence: row.confidence };
    } catch {
      return null;
    }
  }

  // ─── Stats ────────────────────────────────
  getStats(userId: number | null = null): PredictiveStats {
    if (!this.db) {
      return { predictions_made: 0, predictions_hit: 0, hit_rate: 0, enabled: this.enabled };
    }
    try {
      let sql = `SELECT COUNT(*) as total, SUM(hit) as hits FROM predictions WHERE expires_at > ?`;
      const params: unknown[] = [Date.now() - RETENTION_MS];
      if (userId !== null) {
        sql += ` AND user_id = ?`;
        params.push(userId);
      }
      const row = this.db
        .prepare<{ total: number; hits: number | null }>(sql)
        .get(...params);

      const total = row?.total ?? 0;
      const hits = row?.hits ?? 0;
      return {
        predictions_made: total,
        predictions_hit: hits,
        hit_rate: total > 0 ? hits / total : 0,
        enabled: this.enabled,
      };
    } catch {
      return { predictions_made: 0, predictions_hit: 0, hit_rate: 0, enabled: this.enabled };
    }
  }

  cleanup(): void {
    try {
      this.db?.prepare(`DELETE FROM predictions WHERE expires_at < ?`)
        .run(Date.now() - RETENTION_MS);
    } catch {
      // Housekeeping is best-effort.
    }
  }

  /** Retained for the existing unit tests. */
  _buildPromptFor(action: string, context: Record<string, unknown>): string | null {
    return this.buildPromptFor(action, context);
  }
}