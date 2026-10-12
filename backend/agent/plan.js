// ============================================================
// 🗺️ agent/plan.js — Schema validation for model-proposed plans
//
// The model proposes; this code decides. A plan is rejected as a whole
// (with every reason listed) when any of these hold:
//   • it is not an object with a non-empty steps array;
//   • it has more steps than the run's remaining step budget;
//   • a step names an unregistered tool, or one the user may not use;
//   • a step's arguments fail the tool's schema;
//   • depends_on references a missing step, itself, or forms a cycle;
//   • the deterministic resource estimate exceeds the run's budget;
//   • a step's specialist may not use its tool, consultations exceed
//     limits.maxConsults, the same consultation is requested twice, or
//     a review has nothing to review (no depends_on).
// Step risk is taken from the tool registry, never from the model.
// ============================================================
const { validateArgs } = require('./tools');
const { SPECIALISTS, ownerOf, mayUse } = require('./specialists');

// Model calls a step costs on top of the tool call itself.
const MODEL_CALLS_PER_TOOL = { web_research: 6, consult_specialist: 1 };
// Planning + final synthesis + lesson review.
const FIXED_MODEL_CALLS = 3;

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const strList = (v, n, max) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).slice(0, n).map((x) => x.trim().slice(0, max)) : []);

function findCycle(steps) {
  const state = new Array(steps.length).fill(0); // 0 new, 1 visiting, 2 done
  const visit = (i, path) => {
    if (state[i] === 1) return [...path, i];
    if (state[i] === 2) return null;
    state[i] = 1;
    for (const d of steps[i].depends_on) {
      const c = visit(d, [...path, i]);
      if (c) return c;
    }
    state[i] = 2;
    return null;
  };
  for (let i = 0; i < steps.length; i++) {
    const c = visit(i, []);
    if (c) return c;
  }
  return null;
}

/**
 * @param {any} raw  model output (already JSON-parsed or null)
 * @param {{ registry: import('./tools').ToolRegistry, user: {guest?: boolean},
 *   limits: { maxSteps: number, maxToolCalls: number, maxLlmCalls: number } }} opts
 * @returns {{ ok: true, plan: object } | { ok: false, errors: string[] }}
 */
function validatePlan(raw, { registry, user, limits }) {
  const errors = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, errors: ['Plan is not a JSON object.'] };
  if (!Array.isArray(raw.steps) || !raw.steps.length) return { ok: false, errors: ['Plan has no steps.'] };
  if (raw.steps.length > limits.maxSteps) errors.push(`Plan has ${raw.steps.length} steps; at most ${limits.maxSteps} are allowed.`);

  const steps = raw.steps.slice(0, Math.max(limits.maxSteps, 0) || raw.steps.length).map((s, i) => {
    const where = `Step ${i + 1}`;
    if (!s || typeof s !== 'object') { errors.push(`${where} is not an object.`); return null; }
    const tool = typeof s.tool === 'string' ? registry.get(s.tool) : null;
    if (!tool) { errors.push(`${where} uses unknown tool "${String(s.tool).slice(0, 40)}".`); return null; }
    if (user?.guest && !tool.guest) { errors.push(`${where}: tool "${s.tool}" is not available in guest mode.`); return null; }
    if (registry.permits && !registry.permits(tool, user)) { errors.push(`${where}: tool "${s.tool}" is not available to this account.`); return null; }
    const v = validateArgs(tool.params, s.args);
    if (!v.ok) { errors.push(`${where} (${s.tool}): ${v.errors.join('; ')}.`); return null; }
    const deps = s.depends_on === undefined ? [] : s.depends_on;
    if (!Array.isArray(deps) || !deps.every((d) => Number.isInteger(d))) { errors.push(`${where}: depends_on must be a list of step numbers.`); return null; }
    // Specialist: named by the plan, or the tool's owner. It must be allowed that tool.
    const consult = s.tool === 'consult_specialist';
    const named = s.specialist === undefined || s.specialist === null || s.specialist === '' ? null : s.specialist;
    if (named !== null && !(typeof named === 'string' && SPECIALISTS[named])) { errors.push(`${where}: unknown specialist "${String(named).slice(0, 40)}".`); return null; }
    if (consult && named && named !== v.args.specialist) { errors.push(`${where}: step specialist "${named}" does not match the consulted specialist "${v.args.specialist}".`); return null; }
    if (!consult && named && !mayUse(named, s.tool)) { errors.push(`${where}: the ${named} specialist may not use "${s.tool}".`); return null; }
    if (consult && SPECIALISTS[v.args.specialist]?.reviewer && !deps.length) { errors.push(`${where}: a ${v.args.specialist} review needs depends_on (the steps it reviews).`); return null; }
    return {
      specialist: consult ? v.args.specialist : (named || ownerOf(s.tool)),
      title: str(s.title, 200) || s.tool,
      tool: s.tool,
      args: v.args,
      risk: tool.risk,                     // from the registry, not the model
      depends_on: deps,                    // 0-based indices in this plan
      success_criteria: str(s.success_criteria, 300),
      expected_output: str(s.expected_output, 300),
    };
  });

  steps.forEach((s, i) => {
    if (!s) return;
    for (const d of s.depends_on) {
      if (d === i) errors.push(`Step ${i + 1} depends on itself.`);
      else if (d < 0 || d >= steps.length || !steps[d]) errors.push(`Step ${i + 1} depends on missing step ${d + 1}.`);
    }
  });
  if (!errors.length) {
    const cycle = findCycle(steps);
    if (cycle) errors.push(`Dependency cycle: ${cycle.map((i) => i + 1).join(' → ')}.`);
  }

  const valid = steps.filter(Boolean);
  const consults = valid.filter((s) => s.tool === 'consult_specialist');
  if (limits.maxConsults !== undefined && consults.length > limits.maxConsults) errors.push(`Plan uses ${consults.length} specialist consultations; at most ${limits.maxConsults} are allowed for this task.`);
  const seen = new Set();
  for (const c of consults) {
    const key = `${c.args.specialist}|${c.args.task.toLowerCase().replace(/\W+/g, ' ').trim()}`;
    if (seen.has(key)) errors.push(`Duplicate consultation of the ${c.args.specialist} specialist for the same task.`);
    seen.add(key);
  }
  const estimates = {
    tool_calls: valid.length,
    model_calls: FIXED_MODEL_CALLS + valid.reduce((n, s) => n + (MODEL_CALLS_PER_TOOL[s.tool] || 0) + (s.success_criteria ? 1 : 0), 0),
    timeout_ms: valid.reduce((n, s) => n + (registry.get(s.tool)?.timeoutMs || 0), 0),
  };
  if (estimates.tool_calls > limits.maxToolCalls) errors.push(`Plan needs ${estimates.tool_calls} tool calls; the budget allows ${limits.maxToolCalls}.`);
  if (estimates.model_calls > limits.maxLlmCalls) errors.push(`Plan needs about ${estimates.model_calls} model calls; the budget allows ${limits.maxLlmCalls}.`);

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    plan: {
      interpretation: str(raw.interpretation, 500),
      success_criteria: strList(raw.success_criteria, 5, 300),
      assumptions: strList(raw.assumptions, 5, 300),
      unknowns: strList(raw.unknowns, 5, 300),
      constraints: strList(raw.constraints, 5, 300),
      needs_user_input: !!raw.needs_user_input && !!str(raw.question_for_user, 300),
      question_for_user: str(raw.question_for_user, 300),
      steps: valid,
      estimates,
    },
  };
}

/** The plan format requested from the model, kept next to its validator. */
const PLAN_FORMAT = '{"interpretation": "what the user wants", "success_criteria": ["how we will know the goal is met"], '
  + '"assumptions": [], "unknowns": [], "constraints": [], "needs_user_input": false, "question_for_user": "", '
  + '"steps": [{"title": "", "specialist": "optional: who does it", "tool": "", "args": {}, "depends_on": [0-based indices of earlier steps it needs], '
  + '"expected_output": "", "success_criteria": ""}]}';

module.exports = { validatePlan, findCycle, PLAN_FORMAT, MODEL_CALLS_PER_TOOL };
