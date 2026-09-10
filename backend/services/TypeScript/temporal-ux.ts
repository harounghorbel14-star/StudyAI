// ============================================================
// ⏰ services/temporal-ux.ts — Temporal UX Adaptation
// Detects morning/sprint/late-night contexts and adapts
// UI recommendations, tone, and workflow suggestions.
// ============================================================
import type { Database, EventBus, Logger, OperationalMode } from '../../types/core';

export type TimeBlock =
  | 'late_night'
  | 'morning'
  | 'peak_morning'
  | 'midday'
  | 'afternoon'
  | 'evening';

export type EnergyLevel = 'low' | 'building' | 'high' | 'moderate' | 'sustaining' | 'winding';
export type Tone = 'gentle' | 'motivating' | 'focused' | 'balanced' | 'productive' | 'reflective';
export type ActivityPattern = 'unknown' | 'early_bird' | 'day_worker' | 'night_owl';

export interface TemporalContext {
  block: TimeBlock;
  energy: EnergyLevel;
  tone: Tone;
  hour: number;
  isWeekend: boolean;
  pattern: ActivityPattern;
}

export interface BlockConfig {
  mode: OperationalMode;
  theme: 'dim' | 'bright' | 'balanced' | 'warm';
  suggestions: string[];
  ai_style: string;
  deep_work_recommended: boolean;
}

export interface AdaptiveConfig extends TemporalContext {
  config: BlockConfig;
}

export interface WorkflowSuggestion {
  block: TimeBlock;
  time_config: BlockConfig;
  recommended_features: string[];
  reasoning?: string;
}

export interface TemporalUXOptions {
  db?: Database | null;
  events?: EventBus | null;
  logger?: Logger | null;
}

interface PMFEventRow {
  created_at: number;
}

interface FeatureRow {
  feature: string;
  c: number;
}

// Every TimeBlock must have a config — the Record type enforces this
// at compile time, so a new block cannot be added without a config.
const BLOCK_CONFIGS: Record<TimeBlock, BlockConfig> = {
  late_night: {
    mode: 'calm',
    theme: 'dim',
    suggestions: ['Save progress and rest', 'Set a reminder for tomorrow', 'Quick capture only'],
    ai_style: 'concise and gentle',
    deep_work_recommended: false,
  },
  morning: {
    mode: 'focus',
    theme: 'bright',
    suggestions: ['Plan your day', "Review yesterday's progress", 'Set 3 key priorities'],
    ai_style: 'motivating and structured',
    deep_work_recommended: true,
  },
  peak_morning: {
    mode: 'focus',
    theme: 'bright',
    suggestions: ['Tackle hardest task', 'Deep work session', 'Complex problem solving'],
    ai_style: 'analytical and thorough',
    deep_work_recommended: true,
  },
  midday: {
    mode: 'strategy',
    theme: 'balanced',
    suggestions: ['Take a break', 'Review morning progress', 'Communicate with team'],
    ai_style: 'balanced',
    deep_work_recommended: false,
  },
  afternoon: {
    mode: 'creator',
    theme: 'warm',
    suggestions: ['Creative work', 'Collaboration', "Iteration on morning's work"],
    ai_style: 'creative and flexible',
    deep_work_recommended: true,
  },
  evening: {
    mode: 'calm',
    theme: 'warm',
    suggestions: ['Wrap up loose ends', 'Journal reflection', 'Plan tomorrow'],
    ai_style: 'reflective and summarizing',
    deep_work_recommended: false,
  },
};

export class TemporalUX {
  private readonly db: Database | null;
  private readonly events: EventBus | null;
  private readonly logger: Logger | null;

  constructor(options: TemporalUXOptions = {}) {
    this.db = options.db ?? null;
    this.events = options.events ?? null;
    this.logger = options.logger ?? null;
  }

  // ─── Detect user's temporal context ────────
  detectContext(userId: number, now: number = Date.now()): TemporalContext {
    const d = new Date(now);
    const hour = d.getHours();
    const day = d.getDay();
    const isWeekend = day === 0 || day === 6;

    const pattern = this.detectPattern(userId, now);
    const { block, energy, tone } = this.classifyHour(hour);

    return { block, energy, tone, hour, isWeekend, pattern };
  }

  // Pure function — exhaustively covers all 24 hours.
  private classifyHour(hour: number): { block: TimeBlock; energy: EnergyLevel; tone: Tone } {
    if (hour < 5)  return { block: 'late_night',   energy: 'low',        tone: 'gentle' };
    if (hour < 9)  return { block: 'morning',      energy: 'building',   tone: 'motivating' };
    if (hour < 12) return { block: 'peak_morning', energy: 'high',       tone: 'focused' };
    if (hour < 14) return { block: 'midday',       energy: 'moderate',   tone: 'balanced' };
    if (hour < 18) return { block: 'afternoon',    energy: 'sustaining', tone: 'productive' };
    if (hour < 22) return { block: 'evening',      energy: 'winding',    tone: 'reflective' };
    return { block: 'late_night', energy: 'low', tone: 'gentle' };
  }

  // Infer the user's chronotype from their recent activity.
  private detectPattern(userId: number, now: number): ActivityPattern {
    if (!this.db) return 'unknown';
    try {
      const rows = this.db
        .prepare<PMFEventRow>(
          `SELECT created_at FROM pmf_events
           WHERE user_id = ? AND created_at >= ?
           ORDER BY created_at DESC LIMIT 100`
        )
        .all(userId, now - 7 * 24 * 60 * 60 * 1000);

      if (rows.length < 10) return 'unknown';

      const hours = rows.map((r: { created_at: string | number | Date; }) => new Date(r.created_at).getHours());
      const peakHour = this.mode(hours);
      if (peakHour === null) return 'unknown';
      if (peakHour < 12) return 'early_bird';
      if (peakHour < 18) return 'day_worker';
      return 'night_owl';
    } catch {
      return 'unknown';
    }
  }

  // ─── Adaptive config for the current time ──
  getAdaptiveConfig(userId: number, now: number = Date.now()): AdaptiveConfig {
    const ctx = this.detectContext(userId, now);
    // Record lookup is total — TypeScript guarantees a config exists.
    return { ...ctx, config: BLOCK_CONFIGS[ctx.block] };
  }

  // ─── Suggest a workflow for right now ──────
  suggestWorkflow(userId: number, now: number = Date.now()): WorkflowSuggestion {
    const { block, config } = this.getAdaptiveConfig(userId, now);

    if (!this.db) {
      return { block, time_config: config, recommended_features: [] };
    }

    try {
      const past = this.db
        .prepare<FeatureRow>(
          `SELECT feature, COUNT(*) as c FROM pmf_events
           WHERE user_id = ? AND feature IS NOT NULL
           GROUP BY feature ORDER BY c DESC LIMIT 5`
        )
        .all(userId);

      return {
        block,
        time_config: config,
        recommended_features: past.map((p: { feature: any; }) => p.feature),
        reasoning: 'Based on your usage patterns, you typically use these features around this time.',
      };
    } catch {
      return { block, time_config: config, recommended_features: [] };
    }
  }

  // Statistical mode. Returns null for an empty input rather than NaN.
  private mode(values: number[]): number | null {
    if (values.length === 0) return null;
    const counts = new Map<number, number>();
    for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);

    let best: number | null = null;
    let bestCount = -1;
    for (const [value, count] of counts) {
      if (count > bestCount) {
        best = value;
        bestCount = count;
      }
    }
    return best;
  }
}

export { BLOCK_CONFIGS };