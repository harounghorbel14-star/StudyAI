// ============================================================
// Orchestration: intent classification, specialist delegation,
// least-privilege tools per specialist, bounded consultations,
// independent review, coding tools (read-only, admin-only, confined),
// research report provenance. Real AgentRunner / ToolRegistry /
// ResearchEngine on the fixture web; scripted model. No network.
// ============================================================
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const { AgentRunner } = require('../backend/agent/runner');
const { AgentMemory } = require('../backend/agent/memory');
const { buildDefaultTools } = require('../backend/agent/default-tools');
const { validatePlan } = require('../backend/agent/plan');
const { classifyIntent } = require('../backend/agent/intent');
const { SPECIALISTS, mayUse } = require('../backend/agent/specialists');
const { FAILURE } = require('../backend/agent/policy');
const { PAGES, fakeProvider, fakeFetcher, fakeLLM } = require('./helpers/fixture-web');
const { makeRunner } = require('./helpers/harness');

const Q = 'Research when the Lumen Bridge opened and how long it is, then analyse the discrepancy in its length';
process.env.ADMIN_EMAILS = 'admin@x.com';
const userA = { id: 1, email: 'a@x.com', plan: 'free', guest: false };
const admin = { id: 2, email: 'admin@x.com', plan: 'free', guest: false };
const guest = { id: 3, email: 'g@guest.nexusai.invalid', plan: 'guest', guest: true };

// A throwaway repository with things the agent must never read.
function makeRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nx-repo-'));
  const w = (p, c) => { fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true }); fs.writeFileSync(path.join(dir, p), c); };
  w('src/math.js', "function add(a, b) {\n  return a - b; // BUG\n}\n\nmodule.exports = { add };\n");
  w('src/config.js', "const key = process.env.OPENAI_API_KEY || 'sk-proj-ABCDEFGHIJKLMNOPQRSTUVWX1234';\nmodule.exports = { key };\n");
  w('src/dup.js', 'x = 1;\nx = 1;\n');
  w('.env', 'OPENAI_API_KEY=sk-real-secret-value-0000000000\n');
  w('config/secrets.json', '{"password":"hunter2"}');
  w('config/secrets/db.json', '{"password":"in-a-secret-dir"}');
  w('keys/id_rsa', '-----BEGIN OPENSSH PRIVATE KEY-----\nabc\n-----END OPENSSH PRIVATE KEY-----\n');
  w('node_modules/pkg/index.js', 'module.exports = 1;\n');
  w('data/app.db', 'SQLite format 3');
  try { fs.symlinkSync('/etc/hostname', path.join(dir, 'src/escape.txt')); } catch (_) { /* platform without symlinks */ }
  return dir;
}

function setup({ repoRoot, consult, providers } = {}) {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.prepare('CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT, plan TEXT)').run();
  db.prepare("INSERT INTO users (id, email, plan) VALUES (1,'a@x.com','free'),(2,'admin@x.com','free'),(3,'g@guest.nexusai.invalid','guest')").run();
  const memory = new AgentMemory(db);
  const script = { plan: null, plans: null, replan: null, answer: 'Done.' };
  const calls = [];
  const research = fakeLLM([]);
  let planN = 0;
  const llm = async (p) => {
    calls.push(p);
    if (p.system.includes('You are consulted by an orchestrator')) {
      const key = Object.keys(SPECIALISTS).find((k) => p.system.startsWith(require('../backend/agents/registry').AGENTS[SPECIALISTS[k].agent].system));
      const out = consult ? consult(key, p) : { answer: `${key} result`, confidence: 'medium' };
      if (out instanceof Error) throw out;
      return { output: out };
    }
    if (p.system.startsWith('You are the Planner of an autonomous agent')) {
      planN++;
      return { output: script.plans ? script.plans[Math.min(planN, script.plans.length) - 1] : script.plan };
    }
    if (p.system.startsWith('You are the Planner. A step failed')) return { output: script.replan || { steps: [] } };
    if (p.system.startsWith('You are the Validator')) return { output: { satisfied: true, reason: 'ok' } };
    if (p.system.startsWith('You are the Analyst.')) {
      const ids = [...p.prompt.matchAll(/^(E\d+):/gm)].map((m) => m[1]);
      return { output: script.answer === 'cite' ? `Opened 14 March 2019 [${ids[0]}].` : script.answer };
    }
    if (p.system.startsWith('You distil')) return { output: { lesson: '' } };
    return research(p);
  };
  const runner = new AgentRunner({ db, memory, llmFor: () => llm, tools: null });
  runner.tools = buildDefaultTools({ db, memory, providers: providers || [fakeProvider('alpha')], fetcher: fakeFetcher(), env: repoRoot ? { AGENT_REPO_ROOT: repoRoot } : {} });
  const posted = [];
  runner.tools.register({ ...runner.tools.get('http_post'), handler: async (a) => { posted.push(a); return { ok: true }; } });
  return { db, runner, script, calls, posted };
}

const runToEnd = async (env, user, goal, budget) => {
  const run = env.runner.create(user, goal, budget);
  await env.runner.start(user, run.id);
  return env.runner.get(user.id, run.id);
};
const evts = (env, user, run) => env.runner.events(user.id, run.id);
const consultPrompts = (env, key) => env.calls.filter((c) => c.system.includes('You are consulted by an orchestrator')
  && c.system.startsWith(require('../backend/agents/registry').AGENTS[SPECIALISTS[key].agent].system));

(async () => {
  const t = makeRunner('🧭 Agent orchestration (intent, specialists, coding, research report)');
  const repo = makeRepo();
  try {
    // ── Intent ──
    t.section('Intent and complexity classification (deterministic)');
    const cases = [
      ['What is 6*7?', 'analysis', 'simple'],
      ['Fix the bug in backend/routes/agent.js where the endpoint returns 500', 'coding', 'simple'],
      ['Research the latest studies on sleep and cite sources', 'research', 'simple'],
      ['Make a roadmap with milestones for the launch', 'planning', 'simple'],
      ['What pricing strategy should my startup use for enterprise customers?', 'business', 'simple'],
      ['Hello there', 'general', 'simple'],
      [Q, 'research', 'compound'],
    ];
    for (const [goal, cap, cx] of cases) {
      const i = classifyIntent(goal);
      t.check(i.capability === cap && i.complexity === cx, `"${goal.slice(0, 50)}" → ${i.capability}/${i.complexity} (expected ${cap}/${cx})`);
    }
    t.check(JSON.stringify(classifyIntent(Q)) === JSON.stringify(classifyIntent(Q)), 'classification is deterministic');

    // ── Delegation ──
    t.section('Delegation to specialists through one orchestrator');
    let env = setup({
      consult: (key, p) => (key === 'analysis'
        ? { answer: 'Two sources say 1,200 m [S1]; one says 1,450 m [S9].', key_points: ['official figure is 1,200 m [S1]'], confidence: 'medium', concerns: ['brochure figure unverified'] }
        : { answer: 'The analysis follows from the evidence.', confidence: 'high', concerns: [], blocking: false }),
    });
    env.script.answer = 'cite';
    env.script.plan = { steps: [
      { title: 'Research', specialist: 'research', tool: 'web_research', args: { question: 'When did the Lumen Bridge open and how long is it?' } },
      { title: 'Analyse the discrepancy', tool: 'consult_specialist', args: { specialist: 'analysis', task: 'Explain why sources disagree on the length' }, depends_on: [0] },
      { title: 'Independent check', tool: 'consult_specialist', args: { specialist: 'quality', task: 'Check the analysis against the evidence' }, depends_on: [1] },
    ] };
    let run = await runToEnd(env, userA, Q);
    const ev = evts(env, userA, run);
    const intentEv = ev.find((e) => e.type === 'intent.classified');
    t.check(intentEv?.data.capability === 'research' && intentEv.data.complexity === 'compound' && intentEv.data.specialists.includes('research'), 'the run records its intent, complexity and suggested specialists');
    t.check(run.plan.intent?.capability === 'research', 'the plan carries the classified intent');
    const planPrompt = env.calls.find((c) => c.system.startsWith('You are the Planner of an autonomous agent')).prompt;
    t.check(/Task type: research/.test(planPrompt) && /analysis: Analysis Specialist/.test(planPrompt), 'the planner is told the task type and the available specialists');
    t.check(run.status === 'succeeded', `the delegated run succeeds (${run.status}: ${run.error || ''})`);
    t.check(run.steps.map((s) => s.specialist).join() === 'research,analysis,quality', `each step is assigned to a specialist (${run.steps.map((s) => s.specialist).join()})`);
    const ap = consultPrompts(env, 'analysis')[0];
    const qp = consultPrompts(env, 'quality')[0];
    t.check(ap && /Lumen Bridge/.test(ap.prompt) && !/Check the analysis against the evidence/.test(ap.prompt), 'the analysis specialist saw its dependency (research) and not unrelated steps');
    t.check(qp && /Two sources say 1,200 m/.test(qp.prompt), 'the reviewer saw the analysis it reviews');
    t.check(qp && !qp.prompt.includes(PAGES['https://transport.vestria.gov/lumen-bridge'].text), 'context is minimised: the reviewer did not receive raw page text');
    t.check(ap.task === 'reasoning-deep' && qp.task === 'reasoning-fast', `model routing follows the specialist (analysis ${ap.task}, quality ${qp.task})`);
    const analysis = run.steps[1].output;
    t.check(analysis.citation_check.removed.includes('S9') && !/\[S9\]/.test(analysis.answer), 'a citation to a source the specialist was not given is removed and reported');
    t.check(analysis.citations.length === 1 && PAGES[analysis.citations[0].url], 'the citation it was given is carried through unchanged');
    t.check(run.result.citations.every((c) => PAGES[c.url]) && run.result.citations.length >= 1, 'every citation in the final result resolves to a retrieved fixture page');
    t.check(run.result.specialists_used.includes('research') && run.result.specialists_used.includes('analysis') && run.result.reviews?.[0]?.specialist === 'quality', 'the result lists specialists used and the independent review');
    const roles = ev.filter((e) => e.type === 'model.call').map((e) => e.data.role);
    t.check(roles.includes('specialist:analysis') && roles.includes('specialist:quality'), 'each consultation is a recorded, budgeted model call');

    // ── Reviewer disagreement ──
    t.section('Contradictory results and failed specialists');
    env = setup({ consult: (key) => (key === 'security' ? { answer: 'The change leaks the key.', concerns: ['secret exposed in response'], blocking: true, confidence: 'high' } : { answer: 'fine', confidence: 'high' }) });
    env.script.plan = { steps: [
      { title: 'Compute', tool: 'calculate', args: { expression: '6*7' } },
      { title: 'Security review', tool: 'consult_specialist', args: { specialist: 'security', task: 'Review the computation for risks' }, depends_on: [0] },
    ] };
    run = await runToEnd(env, userA, 'Compute 6*7 and then have it reviewed for security');
    const blockCheck = run.result?.verification.checks.find((c) => c.check === 'independent reviews raised no blocking issue');
    t.check(blockCheck && !blockCheck.passed && /secret exposed/.test(blockCheck.detail || ''), 'a blocking review is surfaced as a failed verification check with its concern');
    t.check(run.status === 'failed' && run.result.verification.level !== 'verified', `a blocking review is not hidden: the run is not reported as verified (${run.status}, ${run.result?.verification.level})`);
    const analystPrompt = env.calls.filter((c) => c.system.startsWith('You are the Analyst.')).pop()?.prompt || '';
    t.check(/"blocking":true/.test(analystPrompt), 'the final synthesis is given the reviewer\'s disagreement');

    let bad = 0;
    env = setup({ consult: () => { bad++; return { nonsense: true }; } });
    env.script.plan = { steps: [
      { title: 'Compute', tool: 'calculate', args: { expression: '2+2' } },
      { title: 'Ask the analyst', tool: 'consult_specialist', args: { specialist: 'analysis', task: 'Interpret the number' }, depends_on: [0] },
      { title: 'Review', tool: 'consult_specialist', args: { specialist: 'quality', task: 'Review the interpretation' }, depends_on: [1] },
    ] };
    run = await runToEnd(env, userA, 'Compute two plus two; then interpret the result; then review the interpretation');
    const failedConsult = run.steps.find((s) => s.title === 'Ask the analyst');
    t.check(failedConsult.status === 'failed' && failedConsult.failure?.category === FAILURE.INVALID_MODEL_OUTPUT && bad === 2 && run.usage.retries === 1,
      `invalid specialist output is classified, retried once, then failed (${failedConsult.failure?.category}, ${bad} model answers, ${run.usage.retries} retry)`);
    t.check(run.steps.find((s) => s.title === 'Review').status === 'skipped', 'the step depending on the failed specialist is skipped, not run on missing input');
    t.check(run.result?.failed_steps.some((f) => f.step === 'Ask the analyst') && run.result.verification.level !== 'verified', 'the failure is reported in the result, not hidden');

    env = setup({ consult: () => Object.assign(new Error('all providers failed'), { code: 'PROVIDERS_FAILED' }) });
    env.script.plan = { steps: [{ title: 'Ask', tool: 'consult_specialist', args: { specialist: 'planning', task: 'Plan a launch' } }] };
    run = await runToEnd(env, userA, 'Plan a launch');
    t.check(run.steps[0].status === 'failed' && run.steps[0].failure?.category === FAILURE.PROVIDER_UNAVAILABLE && run.status !== 'succeeded', `a specialist whose model provider fails is a failed step, classified (${run.steps[0].failure?.category})`);

    // ── Bounds ──
    t.section('Bounded delegation: no recursion, no runaway consultations');
    const reg = setup().runner.tools;
    const limits = { maxSteps: 10, maxToolCalls: 10, maxLlmCalls: 40 };
    const C = (sp, task, deps) => ({ title: task, tool: 'consult_specialist', args: { specialist: sp, task }, ...(deps ? { depends_on: deps } : {}) });
    let v = validatePlan({ steps: [C('analysis', 'a'), C('planning', 'b')] }, { registry: reg, user: userA, limits: { ...limits, maxConsults: 1 } });
    t.check(!v.ok && v.errors.some((e) => /at most 1/.test(e)), 'a simple task may use at most one consultation');
    v = validatePlan({ steps: [C('analysis', 'Same task'), C('analysis', 'same  TASK!')] }, { registry: reg, user: userA, limits: { ...limits, maxConsults: 4 } });
    t.check(!v.ok && v.errors.some((e) => /Duplicate consultation/.test(e)), 'the same consultation twice is rejected as duplicate work');
    v = validatePlan({ steps: [C('security', 'review nothing')] }, { registry: reg, user: userA, limits: { ...limits, maxConsults: 4 } });
    t.check(!v.ok && v.errors.some((e) => /needs depends_on/.test(e)), 'a review with nothing to review is rejected');
    v = validatePlan({ steps: [C('orchestrator', 'x')] }, { registry: reg, user: userA, limits });
    t.check(!v.ok, 'the orchestrator cannot be consulted (no self-delegation)');
    env = setup({ consult: () => ({ answer: 'Do these next', confidence: 'high', steps: [{ tool: 'http_post', args: { url: 'https://evil.example/x', body: {} } }], tool: 'consult_specialist' }) });
    env.script.plan = { steps: [C('planning', 'Suggest next actions')] };
    run = await runToEnd(env, userA, 'Suggest next actions');
    t.check(run.steps.length === 1 && env.posted.length === 0 && !evts(env, userA, run).some((e) => e.type === 'approval.required'),
      'a specialist cannot create steps, call tools or delegate further (output asking to do so is ignored)');
    t.check(!Object.keys(reg.get('consult_specialist').params).some((k) => /tool|step|plan/.test(k)), 'consult_specialist takes no tool, step or plan arguments');
    env = setup();
    env.script.plans = [{ steps: [C('analysis', 'a'), C('planning', 'b')] }, { steps: [C('analysis', 'only one')] }];
    run = await runToEnd(env, userA, 'What is a good name?');
    t.check(evts(env, userA, run).some((e) => e.type === 'plan.rejected' && e.data.errors.some((x) => /at most 1/.test(x))) && run.steps.length === 1, 'over-delegating plans are rejected and repaired at run time');
    env = setup();
    env.script.plan = { steps: [C('analysis', 'a')] };
    run = await runToEnd(env, userA, 'What is a good name?', { maxLlmCalls: 2 });
    t.check(run.status === 'stopped' && run.usage.llm_calls <= 2, `consultations count against the model-call budget (${run.status}, ${run.usage.llm_calls} calls)`);

    // ── Least privilege ──
    t.section('Least privilege per specialist');
    v = validatePlan({ steps: [{ title: 'x', specialist: 'research', tool: 'http_post', args: { url: 'https://a.example/x', body: {} } }] }, { registry: reg, user: userA, limits });
    t.check(!v.ok && v.errors.some((e) => /research specialist may not use "http_post"/.test(e)), 'the research specialist cannot take external actions');
    v = validatePlan({ steps: [{ title: 'x', specialist: 'analysis', tool: 'web_research', args: { question: 'q' } }] }, { registry: reg, user: userA, limits });
    t.check(!v.ok, 'the analysis specialist cannot browse');
    v = validatePlan({ steps: [{ title: 'x', specialist: 'wizard', tool: 'calculate', args: { expression: '1' } }] }, { registry: reg, user: userA, limits });
    t.check(!v.ok && v.errors.some((e) => /unknown specialist/.test(e)), 'an invented specialist is rejected');
    t.check(mayUse('orchestrator', 'http_post') && !mayUse('quality', 'http_post') && !mayUse('coding', 'http_post'), 'only the orchestrator owns approval-gated external actions');
    env = setup();
    env.script.plan = { steps: [{ title: 'calc', tool: 'calculate', args: { expression: '1+1' } }] };
    run = env.runner.create(userA, 'Add one and one');
    // Simulate a tampered/recovered step whose specialist does not own its tool.
    await env.runner.start(userA, run.id);
    env.db.prepare("UPDATE agent_run_steps SET status = 'pending', specialist = 'planning' WHERE run_id = ?").run(run.id);
    env.db.prepare("UPDATE agent_runs SET status = 'queued', result = NULL WHERE id = ?").run(run.id);
    await env.runner.start(userA, run.id);
    run = env.runner.get(1, run.id);
    t.check(run.steps[0].failure?.category === FAILURE.PERMISSION_DENIED, `the runner re-checks specialist permissions at execution (${run.steps[0].failure?.category})`);

    // ── Coding tools ──
    t.section('Coding specialist: repository tools are read-only, confined and admin-only');
    t.check(!setup().runner.tools.get('repo_read'), 'without AGENT_REPO_ROOT no repository tool exists');
    env = setup({ repoRoot: repo });
    const tools = env.runner.tools;
    const names = (u) => tools.describe({ user: u }).map((x) => x.name);
    t.check(names(admin).includes('repo_read') && !names(userA).includes('repo_read') && !names(guest).includes('repo_read'), 'repository tools are offered to admins only (not users, not guests)');
    let threw = null; try { tools.prepare('repo_read', { path: 'src/math.js' }, { user: userA }); } catch (e) { threw = e; }
    t.check(threw?.code === 'FORBIDDEN', 'a non-admin cannot call them even if a plan names them');
    v = validatePlan({ steps: [{ title: 'x', tool: 'repo_read', args: { path: 'src/math.js' } }] }, { registry: tools, user: userA, limits });
    t.check(!v.ok && v.errors.some((e) => /not available to this account/.test(e)), 'and a non-admin plan using them is rejected');
    t.check(![...tools.tools.keys()].some((n) => /deploy|merge|push|exec|shell|eval|commit|write_file|apply/.test(n)), `no tool can deploy, merge, push, commit, execute or write files (${[...tools.tools.keys()].join(', ')})`);
    v = validatePlan({ steps: [{ title: 'ship', tool: 'git_push', args: {} }, { title: 'deploy', tool: 'deploy_production', args: {} }] }, { registry: tools, user: admin, limits });
    t.check(!v.ok && v.errors.filter((e) => /unknown tool/.test(e)).length === 2, 'a plan to push or deploy is rejected (no such tools)');

    const exec = (name, args) => tools.execute(name, args, { user: admin, runId: null });
    let r = await exec('repo_read', { path: 'src/math.js' });
    t.check(r.ok && /return a - b/.test(r.output.text) && r.output.untrusted === true, 'an admin can read a source file (marked untrusted)');
    for (const [p, why] of [['../etc/passwd', 'parent traversal'], ['/etc/passwd', 'absolute path'], ['.env', '.env file'], ['config/secrets.json', 'secrets file'], ['config/secrets/db.json', 'file inside a secrets directory'], ['keys/id_rsa', 'private key'],
      ['node_modules/pkg/index.js', 'node_modules'], ['data/app.db', 'database file'], ['src/escape.txt', 'symlink leaving the repo'], ['src/../../x', 'embedded ..']]) {
      r = await exec('repo_read', { path: p });
      t.check(!r.ok && ['FORBIDDEN', 'INVALID_ARGS', 'NOT_FOUND'].includes(r.code), `refused: ${why} (${r.code})`);
    }
    r = await exec('repo_read', { path: 'src/config.js' });
    t.check(r.ok && !r.output.text.includes('sk-proj-ABCDEFGHIJKLMNOPQRSTUVWX1234') && r.output.text.includes('[REDACTED]'), 'credential-shaped strings are redacted from file contents');
    r = await exec('repo_list', {});
    t.check(r.ok && r.output.files.includes('src/math.js') && !r.output.files.some((f) => /\.env|secrets|id_rsa|node_modules|app\.db|escape/.test(f)), `listing hides secrets, dependencies, databases and links (${r.output.files.join(', ')})`);
    r = await exec('repo_search', { query: 'OPENAI_API_KEY' });
    t.check(r.ok && r.output.matches.length >= 1 && r.output.matches.every((m) => m.path !== '.env') && !JSON.stringify(r.output).includes('sk-proj-ABC'), 'search never reads .env and redacts matches');
    r = await exec('repo_search', { query: 'password' });
    t.check(r.ok && r.output.matches.length === 0, 'search does not look inside secret files or directories');
    const before = crypto.createHash('sha256').update(fs.readFileSync(path.join(repo, 'src/math.js'))).digest('hex');
    r = await exec('propose_edit', { path: 'src/dup.js', find: 'x = 1;', replace: 'x = 2;', reason: 'test' });
    t.check(!r.ok && /exactly once/.test(r.error), 'an ambiguous edit (text occurs twice) is refused');

    // ── A whole coding task ──
    env.script.plan = { steps: [
      { title: 'Find add()', specialist: 'coding', tool: 'repo_search', args: { query: 'function add' } },
      { title: 'Read it', specialist: 'coding', tool: 'repo_read', args: { path: 'src/math.js' }, depends_on: [0] },
      { title: 'Propose the fix', specialist: 'coding', tool: 'propose_edit', args: { path: 'src/math.js', find: 'return a - b; // BUG', replace: 'return a + b;', reason: 'add() subtracts' }, depends_on: [1] },
    ] };
    env.script.answer = 'Proposed a fix for add(); it is not applied or tested.';
    run = await runToEnd(env, admin, 'Fix the bug in src/math.js where add() subtracts');
    const cev = evts(env, admin, run);
    t.check(run.plan.intent.capability === 'coding' && cev.some((e) => e.type === 'review.added'), 'a coding run that proposes changes gets an independent security review added automatically');
    t.check(run.steps.at(-1).specialist === 'security' && run.steps.at(-1).status === 'succeeded', 'the security reviewer ran after the proposal');
    const secPrompt = consultPrompts(env, 'security')[0]?.prompt || '';
    t.check(/return a \+ b/.test(secPrompt), 'the reviewer received the proposed diff');
    t.check(run.result.proposed_changes?.[0]?.path === 'src/math.js' && /-  return a - b; \/\/ BUG\n\+  return a \+ b;/.test(run.result.proposed_changes[0].diff) && run.result.proposed_changes[0].applied === false,
      'the result carries the unified diff, marked not applied');
    t.check(crypto.createHash('sha256').update(fs.readFileSync(path.join(repo, 'src/math.js'))).digest('hex') === before, 'the repository file is unchanged on disk');
    t.check(run.result.verification.checks.some((c) => c.check === 'proposed code changes were independently reviewed' && c.passed), 'verification records that the change was reviewed');
    t.check(run.status === 'succeeded', `the coding run completes (${run.status})`);

    // ── Research report ──
    t.section('Deep research report: provenance and honesty');
    env = setup();
    env.script.answer = 'cite';
    env.script.plan = { steps: [{ title: 'Research', tool: 'web_research', args: { question: 'When did the Lumen Bridge open and how long is it?' } }] };
    run = await runToEnd(env, userA, 'Research when the Lumen Bridge opened and cite sources');
    const rep = run.result.report;
    t.check(rep && rep.references.length >= 2 && rep.references.every((x) => PAGES[x.url] && x.title && x.id), 'the report lists references built from retrieved sources only');
    t.check(rep.references.every((x) => x.retrieved_at), 'each reference has a retrieval time');
    t.check(rep.references.some((x) => x.primary) && rep.methodology.providers.includes('alpha') && rep.methodology.pages_used > 0, 'methodology (providers, pages) and primary sources come from the tool output');
    t.check(rep.conflicts.length > 0, 'conflicting evidence (1,200 m vs 1,450 m) is carried into the report');
    const synth = env.calls.filter((c) => c.system.startsWith('You are the Analyst.')).pop()?.prompt || '';
    t.check(/Executive summary/.test(synth) && /Conflicting or weak evidence/.test(synth), 'the analyst is asked for a structured report');

    env = setup({ providers: [{ name: 'empty', search: async () => [] }] });
    env.script.answer = 'The bridge opened in 1850 [E1] according to [E7].';
    env.script.plan = { steps: [{ title: 'Research', tool: 'web_research', args: { question: 'Totally unknown topic xyz' } }] };
    run = await runToEnd(env, userA, 'Research the totally unknown topic xyz');
    t.check((run.result?.citations || []).length === 0 && !/\[E\d+\]/.test(run.result?.answer || ''), 'with no sources, no citation survives (invented [E#] removed)');
    t.check(run.result?.verification.level !== 'verified', `and the run is not reported as verified (${run.result?.verification.level})`);

    // ── Simple stays simple ──
    t.section('Simple tasks stay simple');
    env = setup();
    env.script.plan = { steps: [{ title: 'Multiply', tool: 'calculate', args: { expression: '6*7' } }] };
    run = await runToEnd(env, userA, 'What is 6*7?');
    t.check(run.status === 'succeeded' && run.steps.length === 1 && !run.steps.some((s) => s.tool === 'consult_specialist') && run.usage.llm_calls <= 3,
      `a one-step task uses no specialists and ${run.usage.llm_calls} model calls`);
  } catch (e) {
    t.check(false, `suite crashed: ${e.stack}`);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
  t.done();
})();
