// ============================================================
// 🎼 services/orchestration.ts — Intent-Routed Orchestration
//
// The existing /api/agents/orchestrate runs one fixed six-agent
// pipeline for every request, so "analyze my repository" gets a CEO
// writing startup strategy. This layer picks a pipeline that matches
// what was actually asked, and writes the whole plan up front so the
// Project Workspace can show what is next instead of only what is done.
//
// It reuses agents/registry.js (15 agents) and the existing
// agent_projects / agent_steps tables. It creates no new agent system.
// ============================================================
import type { Database, EventBus, Logger, SmartCall } from '../../types/core';

/** Registry keys — must match agents/registry.js exactly. */
export type AgentKey =
  | 'ceo' | 'product' | 'designer' | 'backend' | 'frontend'
  | 'devops' | 'qa' | 'security' | 'validator' | 'marketing'
  | 'analyst' | 'researcher' | 'planner' | 'supervisor' | 'refiner';

export type Intent =
  | 'build_product'
  | 'analyze_code'
  | 'research_market'
  | 'grow_business'
  | 'deploy_ship'
  | 'general';

export interface PipelineStep {
  agent: AgentKey;
  /** Shown to the user — never the agent key. */
  step: string;
  /** Which earlier steps this one reads. */
  uses?: AgentKey[];
  /**
   * The real-world action this step performs, when it performs one.
   * Steps that only produce a plan leave this unset. Anything listed
   * in DANGEROUS_ACTIONS is gated by the project's autonomy level.
   */
  action?: string;
  /** Explains to the user why approval is being requested. */
  approvalSummary?: string;
}

export interface Pipeline {
  intent: Intent;
  /** What the user sees while this runs. */
  headline: string;
  steps: PipelineStep[];
}

// ─── Pipelines ──────────────────────────────
// Each is ordered so later steps can build on earlier output.
export const PIPELINES: Record<Intent, Pipeline> = {
  build_product: {
    intent: 'build_product',
    headline: 'Building your product',
    steps: [
      { agent: 'ceo',        step: 'Clarifying the opportunity' },
      { agent: 'researcher', step: 'Researching the market',        uses: ['ceo'] },
      { agent: 'planner',    step: 'Planning the build',            uses: ['ceo', 'researcher'] },
      { agent: 'product',    step: 'Defining the product',          uses: ['planner'] },
      { agent: 'designer',   step: 'Designing the interface',       uses: ['product'] },
      { agent: 'backend',    step: 'Designing the backend',         uses: ['product'] },
      { agent: 'frontend',   step: 'Building the frontend',         uses: ['designer', 'backend'] },
      { agent: 'security',   step: 'Reviewing security',            uses: ['backend'] },
      { agent: 'qa',         step: 'Writing the test plan',         uses: ['frontend', 'backend'] },
      { agent: 'devops',     step: 'Preparing deployment',          uses: ['backend'] },
      { agent: 'marketing',  step: 'Drafting go-to-market',         uses: ['product'] },
      { agent: 'supervisor', step: 'Reviewing everything',          uses: ['qa', 'security'] },
    ],
  },

  analyze_code: {
    intent: 'analyze_code',
    headline: 'Analyzing your codebase',
    steps: [
      { agent: 'analyst',   step: 'Mapping the codebase' },
      { agent: 'backend',   step: 'Reviewing architecture',   uses: ['analyst'] },
      { agent: 'security',  step: 'Auditing for risks',       uses: ['analyst'] },
      { agent: 'qa',        step: 'Assessing test coverage',  uses: ['analyst'] },
      { agent: 'refiner',   step: 'Prioritising the fixes',   uses: ['backend', 'security', 'qa'] },
    ],
  },

  research_market: {
    intent: 'research_market',
    headline: 'Researching the market',
    steps: [
      { agent: 'researcher', step: 'Gathering sources' },
      { agent: 'analyst',    step: 'Analysing the data',       uses: ['researcher'] },
      { agent: 'ceo',        step: 'Assessing the opportunity', uses: ['analyst'] },
      { agent: 'validator',  step: 'Stress-testing the case',   uses: ['ceo'] },
    ],
  },

  grow_business: {
    intent: 'grow_business',
    headline: 'Building your growth plan',
    steps: [
      { agent: 'analyst',   step: 'Reading the metrics' },
      { agent: 'marketing', step: 'Finding the channels',     uses: ['analyst'] },
      { agent: 'product',   step: 'Identifying product gaps', uses: ['analyst'] },
      { agent: 'planner',   step: 'Sequencing the actions',   uses: ['marketing', 'product'] },
    ],
  },

  deploy_ship: {
    intent: 'deploy_ship',
    headline: 'Preparing to ship',
    steps: [
      { agent: 'qa',       step: 'Running pre-flight checks' },
      { agent: 'security', step: 'Final security review',    uses: ['qa'] },
      { agent: 'devops',   step: 'Building the deploy plan', uses: ['qa', 'security'] },
      {
        agent: 'devops',
        step: 'Releasing to production',
        uses: ['devops'],
        action: 'deploy.production',
        approvalSummary: 'Release this build to production',
      },
    ],
  },

  general: {
    intent: 'general',
    headline: 'Working on it',
    steps: [
      { agent: 'planner',    step: 'Understanding the request' },
      { agent: 'researcher', step: 'Gathering what is needed', uses: ['planner'] },
      { agent: 'supervisor', step: 'Assembling the answer',    uses: ['researcher'] },
    ],
  },
};

// ─── Intent detection ───────────────────────
// Keyword scoring first; it is deterministic, instant and free.
// The AI classifier is only consulted when keywords are ambiguous.
const INTENT_SIGNALS: Record<Exclude<Intent, 'general'>, RegExp[]> = {
  build_product: [
    /\b(build|create|make|launch|start)\b.*\b(saas|app|product|startup|platform|business|tool|site|website)\b/i,
    /\bbuild me\b/i,
    /\bmvp\b/i,
  ],
  analyze_code: [
    /\b(analyz|review|audit|debug|refactor|inspect)\w*\b.*\b(code|repo|repository|codebase|project)\b/i,
    /\bfind\b.*\b(bug|problem|issue|vulnerabilit)\w*\b/i,
    /\btech(nical)? debt\b/i,
  ],
  research_market: [
    /\b(research|investigate|explore)\w*\b/i,
    // Bounded plurals only. `market\w*` would also match "marketing",
    // which belongs to grow_business.
    /\b(competitors?|markets?|marketplaces?|industr(y|ies)|landscapes?)\b/i,
    /\bis (it|this) worth\b/i,
    /\bvalidate\b.*\bidea\b/i,
  ],
  grow_business: [
    /\b(grow|growth|scale|acquisition|retention|revenue|conversion|churn)\w*\b/i,
    /\bmarketing\b/i,
    /\b(advertis|promot|campaign)\w*\b/i,
    /\bmore (users|customers|signups|sales)\b/i,
  ],
  deploy_ship: [
    /\b(deploy|ship|release|publish|go live|production)\b/i,
    /\bpush to prod\w*\b/i,
  ],
};

export interface IntentResult {
  intent: Intent;
  confidence: number;
  method: 'keyword' | 'ai' | 'fallback';
}

export interface OrchestrationOptions {
  db?: Database | null;
  smartCall?: SmartCall | null;
  events?: EventBus | null;
  logger?: Logger | null;
}

export interface PlannedRun {
  intent: Intent;
  headline: string;
  steps: Array<{ id: number; agent: AgentKey; step: string }>;
}

export class OrchestrationService {
  private readonly db: Database | null;
  private readonly smartCall: SmartCall | null;
  private readonly events: EventBus | null;
  private readonly logger: Logger | null;

  constructor(options: OrchestrationOptions = {}) {
    this.db = options.db ?? null;
    this.smartCall = options.smartCall ?? null;
    this.events = options.events ?? null;
    this.logger = options.logger ?? null;
  }

  /** Deterministic scoring. Returns `general` when nothing matches. */
  detectIntentByKeyword(prompt: string): IntentResult {
    const text = String(prompt ?? '');
    if (!text.trim()) return { intent: 'general', confidence: 0, method: 'fallback' };

    let best: Intent = 'general';
    let bestScore = 0;

    for (const [intent, patterns] of Object.entries(INTENT_SIGNALS)) {
      const hits = patterns.filter((re) => re.test(text)).length;
      if (hits > bestScore) {
        bestScore = hits;
        best = intent as Intent;
      }
    }

    if (bestScore === 0) return { intent: 'general', confidence: 0, method: 'fallback' };
    // Two or more independent signals is a confident match.
    return {
      intent: best,
      confidence: Math.min(1, bestScore / 2),
      method: 'keyword',
    };
  }

  /** Falls back to the model only when keywords are inconclusive. */
  async detectIntent(prompt: string): Promise<IntentResult> {
    const keyword = this.detectIntentByKeyword(prompt);
    if (keyword.confidence >= 1 || !this.smartCall) return keyword;

    try {
      const result = await this.smartCall<{ intent?: string; confidence?: number }>({
        prompt:
          `Classify this request into exactly one intent.\n\n` +
          `Request: "${String(prompt).slice(0, 600)}"\n\n` +
          `Intents:\n` +
          `- build_product: create a new app, product, SaaS or business\n` +
          `- analyze_code: review, audit or debug an existing codebase\n` +
          `- research_market: research a market, competitors or validate an idea\n` +
          `- grow_business: growth, marketing, metrics, retention\n` +
          `- deploy_ship: deploy, release or ship something\n` +
          `- general: anything else\n\n` +
          `Return JSON: { "intent": string, "confidence": 0-1 }`,
        task: 'classification',
        json: true,
        cacheable: true,
        max_tokens: 120,
      });

      const raw = result.output?.intent;
      if (raw && raw in PIPELINES) {
        return {
          intent: raw as Intent,
          confidence: Number(result.output?.confidence ?? 0.7),
          method: 'ai',
        };
      }
    } catch (err: unknown) {
      this.logger?.warn('intent classification failed', {
        err: err instanceof Error ? err.message : String(err),
      });
    }

    // A weak keyword match still beats guessing.
    return keyword;
  }

  getPipeline(intent: Intent): Pipeline {
    return PIPELINES[intent] ?? PIPELINES.general;
  }

  /**
   * Writes every step as `pending` before execution begins.
   * Without this the workspace can only show completed work, so the
   * user cannot see the plan or what is coming next.
   */
  declarePlan(projectId: number, pipeline: Pipeline): PlannedRun {
    const steps: PlannedRun['steps'] = [];
    if (!this.db) {
      return {
        intent: pipeline.intent,
        headline: pipeline.headline,
        steps: pipeline.steps.map((s, i) => ({ id: -(i + 1), agent: s.agent, step: s.step })),
      };
    }

    for (const step of pipeline.steps) {
      try {
        const result = this.db.prepare(
          `INSERT INTO agent_steps (project_id, agent_name, step_name, status, metadata)
           VALUES (?, ?, ?, 'pending', ?)`
        ).run(projectId, step.agent, step.step, JSON.stringify({ uses: step.uses ?? [] }));
        steps.push({ id: Number(result.lastInsertRowid), agent: step.agent, step: step.step });
      } catch (err: unknown) {
        this.logger?.warn('declarePlan insert failed', {
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }

    this.events?.emit('orchestration.planned', {
      project_id: projectId, intent: pipeline.intent, steps: steps.length,
    });

    return { intent: pipeline.intent, headline: pipeline.headline, steps };
  }

  markStep(stepId: number, status: 'running' | 'done' | 'failed' | 'blocked', patch: {
    output?: unknown;
    duration_ms?: number;
  } = {}): void {
    if (!this.db || stepId < 0) return;
    try {
      this.db.prepare(
        `UPDATE agent_steps SET status = ?, output = COALESCE(?, output),
         duration_ms = COALESCE(?, duration_ms) WHERE id = ?`
      ).run(
        status,
        patch.output === undefined ? null : JSON.stringify(patch.output).slice(0, 20000),
        patch.duration_ms ?? null,
        stepId
      );
    } catch {
      // Progress tracking must never abort the run itself.
    }
  }

  /**
   * Rebuilds run state from `agent_steps` so a paused run can resume.
   * State lives in the database rather than in memory, so a resume
   * survives a server restart.
   */
  resumeState(projectId: number, pipeline: Pipeline): {
    startIndex: number;
    completed: Partial<Record<AgentKey, unknown>>;
    stepIds: number[];
  } {
    const empty = { startIndex: 0, completed: {}, stepIds: [] };
    if (!this.db) return empty;

    try {
      const rows = this.db
        .prepare<{ id: number; agent_name: string; status: string; output: string | null }>(
          `SELECT id, agent_name, status, output FROM agent_steps
           WHERE project_id = ? ORDER BY id ASC`
        )
        .all(projectId);

      if (rows.length === 0) return empty;

      const completed: Partial<Record<AgentKey, unknown>> = {};
      let startIndex = rows.length;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.status === 'done') {
          if (row.output) {
            try { completed[row.agent_name as AgentKey] = JSON.parse(row.output); }
            catch { completed[row.agent_name as AgentKey] = row.output; }
          }
          continue;
        }
        // The first step that is not finished is where work resumes.
        startIndex = i;
        break;
      }

      return { startIndex, completed, stepIds: rows.map((r: { id: any; }) => r.id) };
    } catch (err: unknown) {
      this.logger?.warn('resumeState failed', {
        err: err instanceof Error ? err.message : String(err),
      });
      return empty;
    }
  }

  /**
   * Builds the prompt for one step from the outputs it declared a
   * dependency on, so each agent sees only what it needs.
   */
  buildContext(
    goal: string,
    step: PipelineStep,
    completed: Partial<Record<AgentKey, unknown>>
  ): string {
    const parts = [`GOAL: ${String(goal).slice(0, 1500)}`, `YOUR TASK: ${step.step}`];

    for (const dep of step.uses ?? []) {
      const output = completed[dep];
      if (output === undefined) continue;
      let serialised: string;
      try {
        serialised = typeof output === 'string' ? output : JSON.stringify(output);
      } catch {
        continue;
      }
      parts.push(`${dep.toUpperCase()} OUTPUT: ${serialised.slice(0, 1800)}`);
    }

    return parts.join('\n\n');
  }
}