// ============================================================
// Login and guest access through the deployment's routing layer.
//
// A Vercel emulator serves frontend/ and applies vercel.json rewrites
// (tests/helpers/vercel-emulator.js), so the browser talks to the app
// exactly as it does on nexusaitools.it.com:
//
//   A. the committed frontend/vercel.json — reproduces production today:
//      the rewrite targets the REPLACE_WITH_RAILWAY_DOMAIN placeholder,
//      Vercel answers 502 DNS_HOSTNAME_NOT_FOUND (plain text), and the
//      UI must say the backend is unreachable — never "logged in".
//   B. the config scripts/set-backend-domain.js generates once a real
//      Railway host is known, mapped to a locally running backend:
//      login, guest mode, restrictions, logout and server errors work
//      end to end through the rewrite.
// ============================================================
const { chromium } = require('@playwright/test');
const { startServer, makeRunner, sleep } = require('./helpers/harness');
const { startVercelEmulator } = require('./helpers/vercel-emulator');
const { buildConfig } = require('../scripts/set-backend-domain');

const USER = { email: 'existing@example.com', password: 'existing-pass-1' };

async function newPage(browser) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem('nx_intro_seen', '1');
    localStorage.setItem('nx_tour_completed', '1');
    localStorage.setItem('nx_onboarded_v2', 'skipped');
  });
  return { page, errors };
}

(async () => {
  const t = makeRunner('🌍 Login & guest through the Vercel routing layer');
  const backend = await startServer({ llmRules: [{ match: /./, reply: 'ok' }] });
  await backend.call('POST', '/api/signup', { body: USER });
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
  try {
    // ── A ──
    t.section('A. Committed frontend/vercel.json (placeholder host) — production today');
    let vercel = await startVercelEmulator({ port: 3001 });
    let { page, errors } = await newPage(browser);
    await page.goto(vercel.url + '/');
    await page.waitForSelector('#auth-backend-status:not([hidden])', { timeout: 10000 });
    t.check(/can't be reached/.test(await page.textContent('#auth-backend-status')), 'the sign-in screen warns that the server is unreachable before anyone signs in');
    await page.fill('#auth-email', USER.email);
    await page.fill('#auth-password', USER.password);
    await page.click('#auth-btn');
    await page.waitForFunction(() => document.getElementById('auth-error').textContent.length > 0);
    const loginMsg = await page.textContent('#auth-error');
    t.check(/Can't reach the NexusAI server/.test(loginMsg) && /502/.test(loginMsg) && /DNS_HOSTNAME_NOT_FOUND/.test(loginMsg), `login explains the real failure: "${loginMsg}"`);
    t.check(vercel.log.some((l) => l.path === '/api/login' && /replace_with_railway_domain/i.test(l.destination)), 'the request was rewritten to the placeholder host (the root cause)');
    t.check(await page.evaluate(() => localStorage.getItem('nx_t')) === null && !(await page.isVisible('#app')), 'no session is stored and the app is not opened');
    await page.click('#auth-guest-btn');
    await page.waitForFunction(() => /Can't reach/.test(document.getElementById('auth-error').textContent));
    t.check(await page.evaluate(() => localStorage.getItem('nx_t')) === null && !(await page.isVisible('#app')), 'guest mode fails visibly too — no fake guest session');
    t.check(errors.length === 0, 'no uncaught page errors');
    await page.close();
    await vercel.close();

    // ── B ──
    t.section('B. vercel.json generated for a real backend host');
    const HOST = 'nexus-backend.up.railway.app';
    vercel = await startVercelEmulator({ port: 3001, config: buildConfig(HOST), hostMap: { [HOST]: backend.base } });
    ({ page, errors } = await newPage(browser));
    await page.goto(vercel.url + '/');
    await sleep(800);
    t.check(await page.isHidden('#auth-backend-status'), 'no warning when the backend answers /api/health');

    await page.fill('#auth-email', USER.email);
    await page.fill('#auth-password', 'wrong-password-9');
    await page.click('#auth-btn');
    await page.waitForFunction(() => document.getElementById('auth-error').textContent.length > 0);
    t.check(await page.textContent('#auth-error') === 'Invalid email or password.', 'a wrong password shows the server\'s message');

    await page.fill('#auth-password', USER.password);
    await page.click('#auth-btn');
    await page.waitForSelector('#app', { state: 'visible', timeout: 15000 });
    t.check(await page.isVisible('#app'), 'an existing user signs in and the app opens');
    t.check(vercel.log.some((l) => l.path === '/api/login' && l.destination.startsWith(`https://${HOST}/api/login`)), 'the login went through the rewrite to the backend host');
    const token = await page.evaluate(() => localStorage.getItem('nx_t'));
    t.check((await backend.call('GET', '/api/me', { token })).body?.email === USER.email, 'the stored session is valid on the backend');

    await page.evaluate(() => logout());
    await page.waitForSelector('#auth-overlay', { state: 'visible' });
    t.check((await backend.call('GET', '/api/me', { token })).status === 401, 'logout through the proxy revokes the session');

    await page.click('#auth-guest-btn');
    await page.waitForSelector('#app', { state: 'visible', timeout: 15000 });
    t.check(await page.isVisible('#guest-pill'), 'Continue as Guest enters the app in Guest Mode');
    const gtok = await page.evaluate(() => localStorage.getItem('nx_t'));
    const me = await backend.call('GET', '/api/me', { token: gtok });
    t.check(me.body?.guest === true && me.body.plan === 'guest', 'the guest session is a real server-side guest identity');
    const blocked = await page.evaluate(async () => { const r = await fetch('/api/keys', { headers: { Authorization: 'Bearer ' + localStorage.getItem('nx_t') } }); return r.status; });
    t.check(blocked === 403, 'guest restrictions still apply through the proxy');

    // A genuine server error: the user gets a reference that matches the log.
    const Database = require('better-sqlite3');
    const db = new Database(backend.dbPath);
    db.prepare('ALTER TABLE users RENAME TO users_offline').run();
    await page.evaluate(() => logout());
    await page.waitForSelector('#auth-overlay', { state: 'visible' });
    await page.fill('#auth-email', USER.email);
    await page.fill('#auth-password', USER.password);
    await page.click('#auth-btn');
    await page.waitForFunction(() => /Reference:/.test(document.getElementById('auth-error').textContent));
    const ref = (await page.textContent('#auth-error')).match(/Reference: ([0-9a-f]+)/)?.[1];
    await sleep(200);
    t.check(!!ref && backend.log().includes(ref), `a backend failure shows a reference id that appears in the server log (${ref})`);
    db.prepare('ALTER TABLE users_offline RENAME TO users').run();
    db.close();
    t.check(errors.length === 0, `no uncaught page errors (${errors.slice(0, 2).join(' | ') || 'none'})`);
    await vercel.close();
  } catch (e) {
    t.check(false, `suite crashed: ${e.stack}`);
  } finally {
    await browser.close();
    await backend.stop();
  }
  t.done();
})();
