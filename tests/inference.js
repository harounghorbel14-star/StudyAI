// ============================================================
// Inference routing: provider fallback, registry integrity, and
// local-only mode proven against the real server with two fake model
// servers ("local" and "cloud") that record every request.
// ============================================================
const { startServer, startFakeLLM, makeRunner } = require('./helpers/harness');

(async () => {
  const t = makeRunner('🧠 Inference routing tests');
  try {
    // ── Model router (unit) ─────────────────────────────────
    t.section('Model router fallback');
    const router = require('../backend/router/model-router');
    const saved = Object.fromEntries(Object.entries(router.PROVIDERS).map(([k, v]) => [k, v.available]));
    const snapshot = JSON.stringify(router.MODEL_REGISTRY);
    router.PROVIDERS.openai.available = true;
    router.PROVIDERS.anthropic.available = true;
    router.PROVIDERS.deepseek.available = false;

    const calls = [];
    const clients = {
      anthropic: { messages: { create: async (p) => { calls.push(`anthropic:${p.model}`); throw new Error('anthropic down'); } } },
      openai: { chat: { completions: { create: async (p) => { calls.push(`openai:${p.model}`); return { choices: [{ message: { content: 'ok from openai' } }], usage: { total_tokens: 5 } }; } } } },
    };
    const out = await router.execute(clients, { prompt: 'plan a strategy', task: 'reasoning-deep' });
    t.check(out.provider === 'openai' && out.output === 'ok from openai', 'falls back to the next configured provider when the first fails');
    t.check(out.attempts.length === 2 && out.attempts[0].ok === false && out.attempts[0].provider === 'anthropic', 'every attempt is recorded with provider and outcome');
    t.check(JSON.stringify(router.MODEL_REGISTRY) === snapshot, 'a failed call no longer rewrites the shared model registry');
    const again = router.selectModel('reasoning-deep');
    t.check(again.provider === 'anthropic', 'the next request still prefers the original first choice');

    router.PROVIDERS.openai.available = false;
    router.PROVIDERS.anthropic.available = false;
    let err = null;
    try { await router.execute(clients, { prompt: 'x' }); } catch (e) { err = e; }
    t.check(err?.code === 'MODEL_UNAVAILABLE' && /OPENAI_API_KEY|local model/.test(err.message), 'no configured provider → clear MODEL_UNAVAILABLE naming the settings');
    Object.entries(saved).forEach(([k, v]) => { router.PROVIDERS[k].available = v; });

    t.check(router.inferenceMode({ INFERENCE_MODE: 'LOCAL-ONLY' }) === 'local-only', 'INFERENCE_MODE is parsed case-insensitively');
    t.check(router.inferenceMode({ INFERENCE_MODE: 'bogus' }) === 'hybrid', 'unknown INFERENCE_MODE falls back to hybrid');

    // ── Local-only, end to end ──────────────────────────────
    t.section('INFERENCE_MODE=local-only (real server)');
    const local = await startFakeLLM([{ match: /./, reply: 'answer from the LOCAL model' }]);
    const srv = await startServer({
      llmRules: [{ match: /./, reply: 'answer from the CLOUD model' }],
      env: {
        INFERENCE_MODE: 'local-only',
        OPENAI_API_KEY: '',
        LOCAL_LLM_ENABLED: 'true',
        LOCAL_LLM_BACKEND: 'openai-compatible',
        LOCAL_LLM_URL: local.url,
        LOCAL_LLM_MODEL: 'fake-local-7b',
      },
    });
    try {
      t.check(true, 'server boots in local-only mode without OPENAI_API_KEY');
      await srv.call('POST', '/api/signup', { body: { email: 'l@example.com', password: 'local-pass-1' } });
      const tok = (await srv.call('POST', '/api/login', { body: { email: 'l@example.com', password: 'local-pass-1' } })).body.token;
      const st = await srv.call('GET', '/api/inference/status', { token: tok });
      t.check(st.body?.mode === 'local-only' && st.body.sends_prompts_to_third_parties === false, '/api/inference/status reports local-only and no third-party prompts');
      const r = await srv.call('POST', '/api/chat', { token: tok, body: { input: 'What is 2+2?', no_rewrite: true } });
      const text = JSON.stringify(r.body);
      t.check(r.status === 200 && text.includes('LOCAL model'), `chat is answered by the local model (${r.status})`);
      t.check(local.calls.some((c) => c.model === 'fake-local-7b'), 'requests are pinned to LOCAL_LLM_MODEL');
      t.check(srv.llm.calls.length === 0, `the cloud endpoint received zero requests (${srv.llm.calls.length})`);

      local.close();
      const down = await srv.call('POST', '/api/chat', { token: tok, body: { input: 'still there?', no_rewrite: true } });
      t.check(down.status >= 500 && srv.llm.calls.length === 0, `local server down → request fails (${down.status}); still no cloud fallback`);
    } finally {
      await srv.stop();
      local.close();
    }
  } catch (e) {
    t.check(false, `suite crashed: ${e.stack}`);
  }
  t.done();
})();
