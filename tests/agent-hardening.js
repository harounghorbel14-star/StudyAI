// ============================================================
// Agent hardening: approvals, state machine, plan validation, failure
// classes, model deadlines, parallelism, memory retention and lesson
// measurement. Real AgentRunner / ToolRegistry / AgentMemory /
// ResearchEngine on the fixture web; scripted model.
// ============================================================
const Database = require('better-sqlite3');
const { AgentRunner } = require('../backend/agent/runner');
const { AgentMemory } = require('../backend/agent/memory');
const { buildDefaultTools } = require('../backend/agent/default-tools');
const { validatePlan, findCycle } = require('../backend/agent/plan');
const { classifyFailure, FAILURE } = require('../backend/agent/policy');
const { PAGES, fakeProvider, fakeFetcher, fakeLLM } = require('./helpers/fixture-web');
const { makeRunner, sleep } = require('./helpers/harness');

const Q = 'When did the Lumen Bridge open and how long is it?';
const userA = { id: 1, email: 'a@x.com', plan: 'free', guest: false };
const userB = { id: 2, email: 'b@x.com', plan: 'free', guest: false };
const guest = { id: 3, email: 'g@guest.nexusai.invalid', plan: 'guest', guest: true };

function setup({ llmDelay = 0, hang = false } = {}) {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.prepare('CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT, plan TEXT)').run();
  db.prepare("INSERT INTO users (id, email, plan) VALUES (1,'a@x.com','free'),(2,'b@x.com','free'),(3,'g@guest.nexusai.invalid','guest')").run();
  const memory = new AgentMemory(db);
  const script = { plan: null };
  const research = fakeLLM([]);
  const llmOpts = [];
  const llm = async (p) => {
    if (hang) return new Promise(() => {});
    if (llmDelay) await sleep(llmDelay);
    if (p.system.startsWith('You are the Planner of an autonomous agent')) return { output: script.plan, provider: 'fake', model: 'p' };
    if (p.system.startsWith('You are the Planner. A step failed')) return { output: script.replan || { steps: [] } };
    if (p.system.startsWith('You are the Validator')) return { output: { satisfied: true, reason: 'ok' } };
    if (p.system.startsWith('You are the Analyst')) return { output: script.answer || 'Done.' };
    if (p.system.startsWith('You distil')) return { output: { lesson: '' } };
    return research(p);
  };
  const runner = new AgentRunner({ db, memory, llmFor: (u, o) => { llmOpts.push(o); return llm; }, tools: null });
  runner.tools = buildDefaultTools({ db, memory, providers: [fakeProvider('alpha')], fetcher: fakeFetcher() });
  const posted = [];
  let postFails = 0;
  runner.tools.register({ ...runner.tools.get('http_post'), handler: async (args) => {
    posted.push(args);
    if (postFails > 0) { postFails--; throw Object.assign(new Error('503 upstream unavailable'), { code: 'TOOL_ERROR' }); }
    return { ok: true, status: 200 };
  } });
  let flaky = 1; const reads = [];
  runner.tools.register({ name: 'flaky_read', risk: 'read', guest: false, timeoutMs: 2000, description: 'test', params: { n: { type: 'number', required: true } },
    handler: async ({ n }) => { reads.push(n); if (flaky > 0) { flaky--; throw Object.assign(new Error('ECONNRESET'), { code: 'TOOL_ERROR' }); } return { n }; } });
  runner.tools.register({ name: 'slow_read', risk: 'read', guest: false, timeoutMs: 5000, description: 'test', params: { id: { type: 'string', required: true } },
    handler: async ({ id }) => { const t0 = Date.now(); await sleep(250); return { id, t0, t1: Date.now() }; } });
  return { db, memory, runner, script, posted, reads, llmOpts, setPostFails: (n) => { postFails = n; } };
}

const runToEnd = async (env, user, goal, opts) => {
  const run = env.runner.create(user, goal, opts?.budget, opts?.options);
  await env.runner.start(user, run.id);
  return env.runner.get(user.id, run.id);
};
const POST = (url = 'https://hooks.example.com/a', body = { ok: true }) => ({ title: 'Notify', tool: 'http_post', args: { url, body } });

(async () => {
  const t = makeRunner('🛡️  Agent hardening tests');
  try {
    // ── Plan validation (unit) ──
    t.section('Plan validation');
    let env = setup();
    const reg = env.runner.tools;
    const limits = { maxSteps: 4, maxToolCalls: 4, maxLlmCalls: 30 };
    const bad = (raw, re, label) => { const v = validatePlan(raw, { registry: reg, user: userA, limits }); t.check(!v.ok && v.errors.some((e) => re.test(e)), `${label} → rejected (${v.ok ? 'accepted!' : v.errors[0]})`); };
    bad(null, /not a JSON object/, 'non-object plan');
    bad({ steps: [] }, /no steps/, 'empty plan');
    bad({ steps: [{ tool: 'rm_rf', args: {} }] }, /unknown tool/, 'unknown tool');
    bad({ steps: [{ tool: 'calculate', args: { expression: 7 } }] }, /must be a string/, 'invalid argument type');
    bad({ steps: [{ tool: 'calculate', args: { expression: '1', extra: 1 } }] }, /unknown argument/, 'unexpected argument');
    bad({ steps: [{ tool: 'calculate', args: { expression: '1' }, depends_on: [0] }] }, /depends on itself/, 'self dependency');
    bad({ steps: [{ tool: 'calculate', args: { expression: '1' }, depends_on: [5] }] }, /missing step/, 'missing dependency');
    bad({ steps: [{ tool: 'calculate', args: { expression: '1' }, depends_on: [1] }, { tool: 'calculate', args: { expression: '2' }, depends_on: [0] }] }, /cycle/, 'dependency cycle');
    bad({ steps: Array.from({ length: 5 }, () => ({ tool: 'calculate', args: { expression: '1' } })) }, /at most 4/, 'too many steps');
    const vB = validatePlan({ steps: [{ tool: 'web_research', args: { question: 'x y z' } }] }, { registry: reg, user: userA, limits: { ...limits, maxLlmCalls: 5 } });
    t.check(!vB.ok && vB.errors.some((e) => /model calls/.test(e)), `plan over the model-call budget → rejected (${vB.ok ? 'accepted!' : vB.errors[0]})`);
    const vG = validatePlan({ steps: [{ tool: 'http_post', args: { url: 'https://x.example', body: {} } }] }, { registry: reg, user: guest, limits });
    t.check(!vG.ok && /guest mode/.test(vG.errors[0]), 'a guest plan using a non-guest tool is rejected');
    const vR = validatePlan({ steps: [{ ...POST(), risk: 'read' }] }, { registry: reg, user: userA, limits });
    t.check(vR.ok && vR.plan.steps[0].risk === 'external', 'step risk comes from the registry, not from the model (claimed "read" → external)');
    t.check(findCycle([{ depends_on: [] }, { depends_on: [0] }]) === null, 'an acyclic chain is accepted');

    // ── Failure classification (unit) ──
    t.section('Failure classification');
    t.check(classifyFailure({ code: 'TOOL_ERROR', error: 'ECONNRESET' }, { risk: 'read' }).retryable === true, 'transient error on a read-only tool is retryable');
    t.check(classifyFailure({ code: 'TOOL_ERROR', error: '503 upstream' }, { risk: 'external' }).retryable === false, 'the same error on an external tool is never retried');
    t.check(classifyFailure({ code: 'INVALID_ARGS' }).category === FAILURE.INVALID_ARGUMENTS, 'invalid arguments are classified');
    t.check(classifyFailure({ code: 'FORBIDDEN' }).replannable === false, 'permission denial is not replanned');
    t.check(classifyFailure({ ok: true }, { evaluation: { satisfied: false } }).category === FAILURE.VERIFICATION_FAILED, 'an unmet success criterion is a verification failure');

    // ── Approvals ──
    t.section('Approvals: exact, single-use, expiring, owner-bound');
    env = setup();
    env.script.plan = { steps: [POST(), POST()] };       // two IDENTICAL external steps
    let run = env.runner.create(userA, 'Notify the webhook twice');
    await env.runner.start(userA, run.id);
    run = env.runner.get(1, run.id);
    t.check(run.status === 'awaiting_approval' && env.posted.length === 0, 'external step pauses for approval; nothing sent');
    const firstStep = run.pending_action.step_id;
    t.check(env.runner.decide(userB, run.id, 'approve', { stepId: firstStep }) === null, 'another user cannot approve (looks like a missing run)');
    const pendingBefore = env.db.prepare('SELECT status, pending_action FROM agent_runs WHERE id = ?').get(run.id);
    const unchanged = () => {
      const now = env.db.prepare('SELECT status, pending_action FROM agent_runs WHERE id = ?').get(run.id);
      return now.status === pendingBefore.status && now.pending_action === pendingBefore.pending_action
        && env.db.prepare('SELECT COUNT(*) n FROM agent_approvals WHERE run_id = ?').get(run.id).n === 0
        && env.db.prepare('SELECT status FROM agent_run_steps WHERE id = ?').get(firstStep).status === 'needs_approval';
    };
    let err = null;
    for (const [label, sid] of [['missing', undefined], ['empty', ''], ['malformed', 'some-other-step'], ['non-string', 42], ['SQL-ish', "x' OR '1'='1"]]) {
      for (const decision of ['approve', 'reject']) {
        err = null; try { env.runner.decide(userA, run.id, decision, sid === undefined ? {} : { stepId: sid }); } catch (e) { err = e; }
        t.check(err?.code === 'INVALID_STEP_ID' && env.posted.length === 0 && unchanged(), `${decision} with a ${label} step_id is refused and changes nothing`);
      }
    }
    const otherStep = firstStep.replace(/_s(\d+)_/, (_, n) => `_s${Number(n) + 1}_`);
    for (const decision of ['approve', 'reject']) {
      err = null; try { env.runner.decide(userA, run.id, decision, { stepId: otherStep }); } catch (e) { err = e; }
      t.check(err?.code === 'STALE_APPROVAL' && env.posted.length === 0 && unchanged(), `${decision} naming a different (well-formed) step is refused and changes nothing`);
    }
    await env.runner.decide(userA, run.id, 'approve', { stepId: firstStep });
    run = env.runner.get(1, run.id);
    t.check(env.posted.length === 1, 'the approved step ran exactly once');
    t.check(run.status === 'awaiting_approval' && run.pending_action.step_id !== firstStep, 'the second identical step needs its OWN approval (no replay)');
    const used = env.db.prepare('SELECT used_at FROM agent_approvals WHERE step_id = ?').get(firstStep);
    t.check(!!used.used_at, 'the first approval is recorded as used');
    // Replay: re-open the consumed step and try to run it again.
    env.db.prepare("UPDATE agent_run_steps SET status = 'pending' WHERE id = ?").run(firstStep);
    let replay;
    try {
      replay = await env.runner._runStep(run.id, env.db.prepare('SELECT * FROM agent_run_steps WHERE id = ?').get(firstStep), { user: userA, signal: new AbortController().signal, budget: run.budget, audit: () => {} }, { steps: 0, tool_calls: 0, retries: 0 }, run.budget, async () => null);
    } catch (e) { replay = { status: `refused (${e.message})` }; }
    t.check(replay.status !== 'succeeded' && env.posted.length === 1, `a used approval cannot be replayed (${replay.status})`);
    env.db.prepare("UPDATE agent_run_steps SET status = 'succeeded' WHERE id = ?").run(firstStep);
    env.db.prepare("UPDATE agent_runs SET status = 'awaiting_approval' WHERE id = ?").run(run.id);
    // Tampering with the stored pending action is detected.
    const pend = JSON.parse(env.db.prepare('SELECT pending_action FROM agent_runs WHERE id = ?').get(run.id).pending_action);
    env.db.prepare('UPDATE agent_runs SET pending_action = ? WHERE id = ?').run(JSON.stringify({ ...pend, fingerprint: 'f'.repeat(32) }), run.id);
    const second = pend.step_id;
    err = null; try { env.runner.decide(userA, run.id, 'approve', { stepId: firstStep }); } catch (e) { err = e; }
    t.check(err?.code === 'STALE_APPROVAL' && env.posted.length === 1, 'replaying the decision for the already-consumed first step is refused');
    err = null; try { env.runner.decide(userA, run.id, 'approve', { stepId: second }); } catch (e) { err = e; }
    t.check(err?.code === 'STALE_APPROVAL' && env.posted.length === 1, 'a forged/tampered fingerprint cannot be approved');
    env.db.prepare('UPDATE agent_runs SET pending_action = ? WHERE id = ?').run(JSON.stringify({ ...pend, expires_at: Date.now() - 1 }), run.id);
    err = null; try { env.runner.decide(userA, run.id, 'approve', { stepId: second }); } catch (e) { err = e; }
    t.check(err?.code === 'APPROVAL_EXPIRED' && env.posted.length === 1, 'an expired approval request is refused');
    const renewed = JSON.parse(env.db.prepare('SELECT pending_action FROM agent_runs WHERE id = ?').get(run.id).pending_action);
    t.check(renewed.expires_at > Date.now(), 'and is re-issued for a fresh review');
    await env.runner.decide(userA, run.id, 'approve', { stepId: second });
    t.check(env.posted.length === 2 && env.runner.get(1, run.id).status === 'succeeded', 'after its own approval the second step runs once; the run completes');
    err = null; try { env.runner.decide(userA, run.id, 'approve', { stepId: second }); } catch (e) { err = e; }
    t.check(err?.code === 'NOT_AWAITING', 'approving a finished run is refused');

    // Changed arguments need a new approval.
    env = setup();
    env.script.plan = { steps: [POST('https://hooks.example.com/original')] };
    run = env.runner.create(userA, 'Notify the original webhook');
    await env.runner.start(userA, run.id);
    const sid = env.runner.get(1, run.id).pending_action.step_id;
    await env.runner.decide(userA, run.id, 'approve', { stepId: sid }).catch(() => {});
    t.check(env.posted.length === 1 && env.posted[0].url.endsWith('/original'), 'approved arguments are exactly the ones executed');
    env.script.plan = { steps: [POST('https://hooks.example.com/original')] };
    run = env.runner.create(userA, 'Notify the original webhook again');
    await env.runner.start(userA, run.id);
    const s2 = env.runner.get(1, run.id).pending_action.step_id;
    // Grant, then change the step's arguments before it executes (e.g. a re-plan).
    env.db.prepare(`INSERT INTO agent_approvals (run_id, step_id, user_id, tool, fingerprint, created_at, expires_at) SELECT ?, ?, 1, 'http_post', json_extract(pending_action,'$.fingerprint'), ?, ? FROM agent_runs WHERE id = ?`).run(run.id, s2, Date.now(), Date.now() + 60000, run.id);
    env.db.prepare('UPDATE agent_run_steps SET args = ? WHERE id = ?').run(JSON.stringify({ url: 'https://attacker.example.net/x', body: { ok: true } }), s2);
    env.db.prepare("UPDATE agent_runs SET status = 'queued', pending_action = NULL WHERE id = ?").run(run.id);
    env.db.prepare("UPDATE agent_run_steps SET status = 'pending' WHERE id = ?").run(s2);
    await env.runner.start(userA, run.id);
    t.check(env.posted.length === 1 && env.runner.get(1, run.id).status === 'awaiting_approval', 'modified arguments invalidate the approval and ask again');
    t.check(env.runner.get(1, run.id).pending_action.args.url.includes('attacker'), 'the new request shows the changed arguments for review');
    t.check(sid !== s2, 'approvals are per step');

    // ── State machine ──
    t.section('Run state machine');
    env = setup();
    env.script.plan = { steps: [{ title: 'calc', tool: 'calculate', args: { expression: '2*21' } }] };
    run = await runToEnd(env, userA, 'What is two times twenty one?');
    t.check(run.status === 'succeeded', 'a simple run succeeds');
    await env.runner.start(userA, run.id);
    t.check(env.runner.get(1, run.id).status === 'succeeded' && env.runner.events(1, run.id).some((e) => e.type === 'state.transition_refused'), 'a stale start() cannot revive a finished run');
    t.check(env.runner.cancel(1, run.id).changed === false, 'cancel on a finished run changes nothing');
    env.script.plan = { steps: [{ title: 'calc', tool: 'calculate', args: { expression: '1+1' } }] };
    const slow = setup({ llmDelay: 150 });
    slow.script.plan = { steps: [{ title: 'calc', tool: 'calculate', args: { expression: '1+1' } }] };
    const sr = slow.runner.create(userA, 'Add one and one please');
    const sp = slow.runner.start(userA, sr.id);
    await sleep(220);                 // planning (150 ms) and the step are done; the Analyst is running
    slow.runner.cancel(1, sr.id);
    await sp;
    t.check(slow.runner.get(1, sr.id).status === 'cancelled', 'a cancel that lands during synthesis ends as cancelled, not stuck in "cancelling"');

    // ── Retries, failures, deadlines ──
    t.section('Retries, failure classes and deadlines');
    env = setup();
    env.script.plan = { steps: [{ title: 'flaky', tool: 'flaky_read', args: { n: 1 } }] };
    run = await runToEnd(env, userA, 'Read the flaky source once');
    t.check(run.status === 'succeeded' && env.reads.length === 2 && run.usage.retries === 1, 'a transient read failure is retried once, then succeeds');
    env = setup();
    env.setPostFails(5);
    env.script.plan = { steps: [POST()] };
    run = env.runner.create(userA, 'Notify the webhook once');
    await env.runner.start(userA, run.id);
    await env.runner.decide(userA, run.id, 'approve', { stepId: env.runner.get(1, run.id).pending_action.step_id });
    run = env.runner.get(1, run.id);
    const failure = run.steps[0].failure;
    t.check(env.posted.length === 1 && failure?.category === FAILURE.TRANSIENT && failure.retryable === false, 'a failing external call is attempted once and never retried');
    process.env.AGENT_MODEL_TIMEOUT_MS = '200';
    const hung = setup({ hang: true });
    const t0 = Date.now();
    run = await runToEnd(hung, userA, 'Lumen Bridge total length official');
    delete process.env.AGENT_MODEL_TIMEOUT_MS;
    const timeouts = hung.runner.events(1, run.id).filter((e) => e.type === 'model.call' && e.data.code === 'MODEL_TIMEOUT');
    t.check(timeouts.length > 0 && Date.now() - t0 < 20_000, `a hung model provider times out per call (${timeouts.length} timeouts) instead of stalling the run`);
    t.check(['succeeded', 'failed', 'stopped'].includes(run.status) && ['fallback_after_invalid_plan', 'fallback_no_model'].includes(run.plan.source), `the run still finishes using the deterministic plan (${run.status}, ${run.plan.source})`);

    // ── Parallelism and dependencies ──
    t.section('Bounded parallelism for independent read-only steps');
    env = setup();
    env.script.plan = { steps: [
      { title: 'A', tool: 'slow_read', args: { id: 'a' } },
      { title: 'B', tool: 'slow_read', args: { id: 'b' } },
      { title: 'C needs A and B', tool: 'calculate', args: { expression: '1+1' }, depends_on: [0, 1] },
    ] };
    run = await runToEnd(env, userA, 'Read two sources then combine');
    const [a, b, c] = run.steps;
    const overlap = a.output.t0 < b.output.t1 && b.output.t0 < a.output.t1;
    t.check(run.status === 'succeeded' && overlap, 'independent read-only steps ran concurrently');
    t.check(new Date(c.started_at) >= new Date(Math.max(new Date(a.finished_at), new Date(b.finished_at))), 'the dependent step started only after both dependencies finished');
    t.check(env.runner.events(1, run.id).some((e) => e.type === 'steps.parallel'), 'parallel execution is visible in the events');
    env = setup();
    env.script.plan = { steps: [POST('https://hooks.example.com/1'), POST('https://hooks.example.com/2')] };
    run = env.runner.create(userA, 'Notify two hooks');
    await env.runner.start(userA, run.id);
    t.check(env.runner.get(1, run.id).steps.filter((s) => s.status === 'needs_approval').length === 1, 'external steps are never batched: one approval request at a time');
    env = setup();
    env.script.plan = { steps: [{ title: 'fail', tool: 'fetch_page', args: { url: 'https://unknown.example/x' } }, { title: 'after', tool: 'calculate', args: { expression: '1' }, depends_on: [0] }] };
    env.script.replan = { steps: [] };
    run = await runToEnd(env, userA, 'Fetch then compute');
    t.check(run.steps[1].status === 'skipped' && run.result.failed_steps.length >= 1, 'a step whose dependency failed is skipped, and the report says so');

    // ── Privacy routing ──
    t.section('Per-run privacy');
    env = setup();
    env.script.plan = { steps: [{ title: 'calc', tool: 'calculate', args: { expression: '3*3' } }] };
    run = await runToEnd(env, userA, 'Square three privately', { options: { privacy: 'local' } });
    t.check(run.options.privacy === 'local' && env.llmOpts.at(-1)?.localOnly === true, 'a privacy:"local" run asks for local-only inference on every model call');

    // ── Memory ──
    t.section('Memory retention, freshness, isolation and lesson measurement');
    process.env.AGENT_MAX_LESSONS_PER_USER = '3';
    const mem = env.memory;
    const distinct = ['Prefer the operating agency for bridge lengths', 'Cross-check opening dates against two newspapers',
      'Use the calculate tool for unit conversions', 'Search Wikipedia first for infrastructure overviews', 'Quote the exact sentence for every figure'];
    for (const text of distinct) mem.addByUser(1, text);
    t.check(mem.list(1).length === 3, 'lessons beyond the retention limit are pruned (oldest first)');
    delete process.env.AGENT_MAX_LESSONS_PER_USER;
    t.check(mem.list(2).length === 0, "another user's lessons are untouched");
    const db2 = env.db;
    mem.addByUser(1, 'Bridge lengths: check the agency figure');
    mem.addByUser(1, 'Bridge lengths: check the agency number');
    const both = mem.list(1).filter((l) => l.text.startsWith('Bridge lengths'));
    db2.prepare('UPDATE agent_lessons SET created_at = ?, reviewed_at = ? WHERE id = ?').run(Date.now() - 900 * 86400000, Date.now() - 900 * 86400000, both[1].id);
    const ranked = mem.relevantLessons(1, 'bridge lengths agency check');
    t.check(ranked.length >= 2 && ranked[0].id === both[0].id, 'an old lesson ranks below an equally relevant recent one');
    const rej = mem.list(1)[0];
    mem.review(1, rej.id, 'rejected');
    t.check(!mem.relevantLessons(1, rej.text).some((l) => l.id === rej.id), 'a rejected lesson is never retrieved');
    mem.recordEvidence(1, 'run_x', [{ url: 'https://a.example', title: 'A', quotes: ['quote one'] }]);
    mem.recordEvidence(2, 'run_y', [{ url: 'https://b.example', title: 'B', quotes: ['quote two'] }]);
    const evA = mem.listEvidence(1);
    t.check(evA.length >= 1 && evA.every((e) => e.url !== 'https://b.example'), "a user sees only their own evidence");
    t.check(mem.deleteEvidence(2, evA[0].id) === false && mem.deleteEvidence(1, evA[0].id) === true, "a user can delete their own evidence but not someone else's");
    // Measured on user 2, who has no earlier runs in this database.
    for (let i = 0; i < 6; i++) mem.recordLessonOutcome(2, `b${i}`, [], i < 3 ? 'succeeded' : 'failed');
    for (let i = 0; i < 6; i++) mem.recordLessonOutcome(2, `l${i}`, [ranked[0].id], i < 5 ? 'succeeded' : 'failed');
    const eff = mem.lessonEffectiveness(2);
    const row = eff.lessons.find((l) => l.lesson_id === ranked[0].id);
    t.check(eff.baseline.success_rate === 0.5 && Math.abs(row.success_rate - 5 / 6) < 1e-9 && row.delta_vs_baseline === 0.33 && row.sample === 'ok', `lesson effect is measured against a baseline (+${row.delta_vs_baseline})`);
    t.check(!mem.lessonEffectiveness(1).lessons.some((l) => l.lesson_id === ranked[0].id && l.runs === 6), 'effectiveness data is per user');
    env.script.plan = { steps: [{ title: 'calc', tool: 'calculate', args: { expression: '1+2' } }] };
    run = await runToEnd(env, userA, 'bridges lengths lesson question');
    t.check(env.db.prepare('SELECT COUNT(*) c FROM agent_lesson_uses WHERE run_id = ?').get(run.id).c >= 1, 'every finished run records which lessons it used and its outcome');
  } catch (e) {
    t.check(false, `suite crashed: ${e.stack}`);
  }
  t.done();
})();
