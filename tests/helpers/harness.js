// ============================================================
// Test harness: boots the real backend/server.js in a temp directory
// with a fresh SQLite database, a test-only mail outbox, and a local
// fake OpenAI-compatible model server. No request leaves the machine
// and no paid API is called, so results are deterministic in CI.
//
// The fake model answers by matching the request against `rules`
// (first match wins); unmatched requests get a plain echo. Every
// request is recorded so tests can assert what the server sent.
// ============================================================
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function startFakeLLM(rules = []) {
  const calls = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      let parsed = {};
      try { parsed = JSON.parse(body || '{}'); } catch (_) { /* ignore */ }
      const text = (parsed.messages || []).map((m) => (typeof m.content === 'string' ? m.content : '')).join('\n');
      calls.push({ path: req.url, model: parsed.model, text });
      if (req.url.endsWith('/models')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ data: [{ id: 'fake-model' }] }));
      }
      const rule = rules.find((r) => (typeof r.match === 'string' ? text.includes(r.match) : r.match.test(text)));
      if (rule?.status) {
        res.writeHead(rule.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: { message: 'fake failure' } }));
      }
      const content = rule ? (typeof rule.reply === 'function' ? rule.reply(text, parsed) : rule.reply) : `echo: ${text.slice(-200)}`;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        id: 'fake', object: 'chat.completion', model: parsed.model || 'fake-model',
        choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: typeof content === 'string' ? content : JSON.stringify(content) } }],
        usage: { prompt_tokens: Math.ceil(text.length / 4), completion_tokens: 20, total_tokens: Math.ceil(text.length / 4) + 20 },
      }));
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => {
    resolve({ url: `http://127.0.0.1:${server.address().port}`, calls, rules, close: () => server.close() });
  }));
}

async function startServer({ env = {}, llmRules = [], port: fixedPort } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nx-it-'));
  const outbox = path.join(dir, 'outbox');
  const llm = await startFakeLLM(llmRules);
  const port = fixedPort || 20000 + Math.floor(Math.random() * 20000);
  const child = spawn(process.execPath, [path.join(ROOT, 'backend', 'server.js')], {
    cwd: dir,
    env: {
      PATH: process.env.PATH,
      NODE_ENV: 'test',
      PORT: String(port),
      DB_PATH: path.join(dir, 'test.db'),
      JWT_SECRET: 'test-only-jwt-secret-0123456789abcdef0123456789',
      DEPLOY_KEY: 'test-deploy-key-32-chars-1234567890',
      OPENAI_API_KEY: 'sk-test-dummy',
      OPENAI_BASE_URL: `${llm.url}/v1`,
      STRIPE_SECRET_KEY: 'sk_test_dummy',
      STRIPE_WEBHOOK_SECRET: 'whsec_dummy',
      MAIL_TRANSPORT: 'outbox',
      MAIL_OUTBOX_DIR: outbox,
      APP_URL: 'http://app.test',
      BCRYPT_ROUNDS: '4',
      ADMIN_EMAILS: 'admin@example.com',
      ...env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout.on('data', (d) => { log += d; });
  child.stderr.on('data', (d) => { log += d; });
  const base = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 30_000;
  for (;;) {
    if (child.exitCode !== null) throw new Error(`server exited early:\n${log}`);
    try { if ((await fetch(`${base}/health`)).ok) break; } catch (_) { /* not up yet */ }
    if (Date.now() > deadline) { child.kill(); throw new Error(`server did not start:\n${log}`); }
    await new Promise((r) => setTimeout(r, 150));
  }

  // A browser-like client: the protection middleware rejects obvious bots.
  const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
  async function call(method, url, { token, body, headers = {} } = {}) {
    const res = await fetch(base + url, {
      method,
      headers: {
        'User-Agent': UA, Accept: 'application/json', 'Accept-Language': 'en',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch (_) { /* not JSON */ }
    return { status: res.status, body: json, text, headers: res.headers };
  }

  function readOutbox() {
    if (!fs.existsSync(outbox)) return [];
    return fs.readdirSync(outbox).sort().map((f) => JSON.parse(fs.readFileSync(path.join(outbox, f), 'utf8')));
  }

  async function stop() {
    child.kill();
    llm.close();
    await new Promise((r) => setTimeout(r, 100));
    fs.rmSync(dir, { recursive: true, force: true });
  }

  return { base, call, readOutbox, stop, llm, dir, log: () => log, dbPath: path.join(dir, 'test.db') };
}

// Tiny assertion runner shared by the integration suites.
function makeRunner(title) {
  let passed = 0;
  const failures = [];
  console.log(`\n\x1b[1m${title}\x1b[0m`);
  return {
    check(cond, msg) {
      if (cond) { passed++; console.log(`  ✅ ${msg}`); } else { failures.push(msg); console.log(`  ❌ ${msg}`); }
    },
    section(name) { console.log(`\n\x1b[36m── ${name}\x1b[0m`); },
    done() {
      console.log(`\n${failures.length ? '\x1b[31m❌' : '\x1b[32m✅'} ${passed}/${passed + failures.length} checks passed\x1b[0m`);
      if (failures.length) process.exitCode = 1;
      return failures.length === 0;
    },
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = { startServer, startFakeLLM, makeRunner, sleep, ROOT };
