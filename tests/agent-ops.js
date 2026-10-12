// ============================================================
// Agent operations against the real server process:
//   • /ready reflects database, services and draining
//   • SIGTERM drains; a run interrupted by shutdown is recovered and
//     finished after a restart on the same database
//   • per-run privacy "local" and INFERENCE_CLOUD_FALLBACK=deny never
//     reach the (fake) cloud model; an allowed fallback is visible
// ============================================================
const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');
const { startServer, startFakeLLM, makeRunner, sleep } = require('./helpers/harness');

const PLAN = JSON.stringify({ interpretation: 'compute', steps: [{ title: 'Multiply', tool: 'calculate', args: { expression: '6*7' } }] });
const rulesFast = [
  { match: 'You are the Planner of an autonomous agent', reply: PLAN },
  { match: 'You are the Analyst', reply: 'The product is 42.' },
  { match: 'You distil one reusable', reply: JSON.stringify({ lesson: '' }) },
];

async function login(srv, email) {
  await srv.call('POST', '/api/signup', { body: { email, password: 'ops-password-1' } });
  return (await srv.call('POST', '/api/login', { body: { email, password: 'ops-password-1' } })).body.token;
}
async function waitRun(srv, token, id, done = ['succeeded', 'failed', 'stopped', 'cancelled'], ms = 20000) {
  const end = Date.now() + ms;
  let run;
  while (Date.now() < end) {
    run = (await srv.call('GET', `/api/agent/runs/${id}`, { token })).body?.run;
    if (run && done.includes(run.status)) return run;
    await sleep(200);
  }
  return run;
}

(async () => {
  const t = makeRunner('⚙️  Agent operations (real server)');
  const keep = fs.mkdtempSync(path.join(os.tmpdir(), 'nx-ops-'));
  const DB = path.join(keep, 'ops.db');
  try {
    // ── Readiness ──
    t.section('Health and readiness');
    let srv = await startServer({ env: { DB_PATH: DB, RESEARCH_WIKIPEDIA: 'off', AGENT_SHUTDOWN_GRACE_MS: '300' }, dir: keep,
      llmRules: [{ ...rulesFast[0], delayMs: 2500 }, ...rulesFast.slice(1)] });
    let r = await srv.call('GET', '/ready');
    t.check(r.status === 200 && r.body.status === 'ready' && r.body.checks.database === 'ok' && r.body.checks.agent_runtime === 'ok', '/ready reports database, services and agent runtime');
    t.check(r.body.checks.inference?.mode === 'hybrid' && r.body.checks.inference.can_serve === true, '/ready reports inference mode and whether a model can serve');
    t.check((await srv.call('GET', '/api/ready')).status === 200 && (await srv.call('GET', '/health')).body.status === 'ok', '/api/ready works through the /api rewrite; /health is unchanged');

    // ── Shutdown and recovery ──
    t.section('SIGTERM drain and restart recovery');
    let tok = await login(srv, 'ops@example.com');
    r = await srv.call('POST', '/api/agent/runs', { token: tok, body: { goal: 'What is six times seven?' } });
    const id = r.body.run.id;
    await sleep(400);                                     // planner is still "thinking"
    const t0 = Date.now();
    srv.child.kill('SIGTERM');
    const exit = await srv.exited;
    srv.llm.close();
    t.check(exit.code === 0 && Date.now() - t0 < 8000, `SIGTERM drains and exits cleanly within the grace period (${Date.now() - t0} ms, code ${exit.code})`);
    const mid = new Database(DB, { readonly: true }).prepare('SELECT status FROM agent_runs WHERE id = ?').get(id);
    t.check(['running', 'queued'].includes(mid.status), `the interrupted run was left resumable in the database (${mid.status})`);

    srv = await startServer({ env: { DB_PATH: DB, RESEARCH_WIKIPEDIA: 'off' }, dir: keep, llmRules: rulesFast });
    tok = (await srv.call('POST', '/api/login', { body: { email: 'ops@example.com', password: 'ops-password-1' } })).body.token;
    const run = await waitRun(srv, tok, id);
    t.check(run?.status === 'succeeded' && run.steps[0]?.output?.value === 42, `after restart the run was recovered and completed (${run?.status})`);
    const ev = (await srv.call('GET', `/api/agent/runs/${id}/events`, { token: tok })).body.events.map((e) => e.type);
    t.check(ev.includes('run.recovered') && ev.includes('run.succeeded'), 'recovery is visible in the run events');
    await srv.stop();

    // ── Inference privacy ──
    t.section('Privacy routing (fake cloud must receive nothing)');
    const deadLocal = 'http://127.0.0.1:9';           // nothing listens here
    srv = await startServer({ env: { RESEARCH_WIKIPEDIA: 'off', LOCAL_LLM_ENABLED: 'true', LOCAL_LLM_BACKEND: 'openai-compatible', LOCAL_LLM_URL: deadLocal }, llmRules: rulesFast });
    tok = await login(srv, 'priv@example.com');
    const secretGoal = 'Multiply 6 by 7 for the confidential Falcon-X budget';
    r = await srv.call('POST', '/api/agent/runs', { token: tok, body: { goal: secretGoal, privacy: 'local' } });
    t.check(r.status === 202 && r.body.run.options.privacy === 'local', 'a run can be created with privacy "local"');
    let pr = await waitRun(srv, tok, r.body.run.id);
    t.check(!srv.llm.calls.some((c) => c.text.includes('Falcon-X')), `with the local model down, the private goal never reached the cloud model (${srv.llm.calls.length} cloud calls in total)`);
    t.check(['failed', 'stopped'].includes(pr.status), `the private run fails honestly instead of falling back (${pr.status})`);
    const failedCalls = (await srv.call('GET', `/api/agent/runs/${pr.id}/events`, { token: tok })).body.events.filter((e) => e.type === 'model.call' && !e.data.ok);
    t.check(failedCalls.length > 0 && failedCalls.every((e) => e.data.code === 'MODEL_UNAVAILABLE'), 'the model calls are reported as unavailable (local-only), not silently rerouted');
    r = await srv.call('POST', '/api/agent/runs', { token: tok, body: { goal: 'Ordinary question: six times seven?', privacy: 'public' } });
    t.check(r.status === 400, 'an invalid privacy value is rejected');
    await srv.stop();

    const local = await startFakeLLM([{ match: /./, status: 500 }]);     // reachable, but every completion fails
    const hybridEnv = { RESEARCH_WIKIPEDIA: 'off', LOCAL_LLM_ENABLED: 'true', LOCAL_LLM_BACKEND: 'openai-compatible', LOCAL_LLM_URL: local.url,
      LOCAL_LLM_TASKS: 'reasoning-deep,reasoning-fast,extraction,classification,summarization,general' };
    srv = await startServer({ env: { ...hybridEnv, INFERENCE_CLOUD_FALLBACK: 'deny' }, llmRules: rulesFast });
    tok = await login(srv, 'deny@example.com');
    r = await srv.call('POST', '/api/agent/runs', { token: tok, body: { goal: 'Deny fallback: Orion-7 six times seven?' } });
    pr = await waitRun(srv, tok, r.body.run.id);
    t.check(local.calls.some((c) => c.text.includes('Orion-7')), 'hybrid mode tried the local model first');
    t.check(!srv.llm.calls.some((c) => c.text.includes('Orion-7')), 'INFERENCE_CLOUD_FALLBACK=deny: the failed local request was NOT sent to the cloud');
    await srv.stop();

    srv = await startServer({ env: hybridEnv, llmRules: rulesFast });
    tok = await login(srv, 'allow@example.com');
    r = await srv.call('POST', '/api/agent/runs', { token: tok, body: { goal: 'Allow fallback: Vega-3 six times seven?' } });
    pr = await waitRun(srv, tok, r.body.run.id);
    const calls = (await srv.call('GET', `/api/agent/runs/${pr.id}/events`, { token: tok })).body.events.filter((e) => e.type === 'model.call' && e.data.ok);
    t.check(srv.llm.calls.some((c) => c.text.includes('Vega-3')) && calls.some((e) => e.data.routing?.fallback === true && e.data.routing.fallback_from === 'local'), 'with fallback allowed, the cloud answered and the fallback is recorded on the model call');
    t.check(pr.status === 'succeeded' && pr.usage.fallbacks > 0, `the run reports how many calls fell back (${pr.usage.fallbacks})`);
    await srv.stop();
    local.close();
  } catch (e) {
    t.check(false, `suite crashed: ${e.stack}`);
  } finally {
    fs.rmSync(keep, { recursive: true, force: true });
  }
  t.done();
})();
