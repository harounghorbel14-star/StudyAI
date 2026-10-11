// ============================================================
// Authentication, password recovery and guest mode, end to end
// against the real server (see tests/helpers/harness.js).
// ============================================================
const Database = require('better-sqlite3');
const { startServer, makeRunner, sleep } = require('./helpers/harness');

(async () => {
  const t = makeRunner('🔐 Auth integration tests (real server, temp DB)');
  const srv = await startServer();
  const { call } = srv;
  try {
    // ── Signup / login ──────────────────────────────────────
    t.section('Signup & login');
    const email = 'alice@example.com';
    const password = 'correct-horse-1';
    let r = await call('POST', '/api/signup', { body: { email: ' Alice@Example.com ', password } });
    t.check(r.status === 201, `signup succeeds (${r.status})`);
    r = await call('POST', '/api/signup', { body: { email, password } });
    t.check(r.status === 409, 'duplicate signup (different case/whitespace) is rejected');
    r = await call('POST', '/api/signup', { body: { email: 'short@example.com', password: 'short' } });
    t.check(r.status === 400 && /8 characters/.test(r.body?.error), 'short password rejected with a clear message');
    r = await call('POST', '/api/signup', { body: { email: 'x@guest.nexusai.invalid', password } });
    t.check(r.status === 400, 'cannot sign up with a reserved guest address');
    r = await call('POST', '/api/signup', { body: { email: { $ne: 1 }, password } });
    t.check(r.status === 400, 'non-string email is a 400, not a crash');

    const db = new Database(srv.dbPath, { readonly: true });
    const stored = db.prepare('SELECT password FROM users WHERE email = ?').get(email);
    t.check(stored && stored.password !== password && /^\$2[aby]\$/.test(stored.password), 'password is stored as a bcrypt hash, never plaintext');

    r = await call('POST', '/api/login', { body: { email, password: 'wrong-password' } });
    t.check(r.status === 401 && r.body?.error === 'Invalid email or password.', 'wrong password → 401 with a neutral message');
    r = await call('POST', '/api/login', { body: { email: 'nobody@example.com', password } });
    t.check(r.status === 401 && r.body?.error === 'Invalid email or password.', 'unknown email → same neutral message');
    r = await call('POST', '/api/login', { body: { email: 'ALICE@example.com', password } });
    t.check(r.status === 200 && typeof r.body?.token === 'string', 'correct credentials (any case) → token');
    const aliceToken = r.body.token;

    r = await call('GET', '/api/me', { token: aliceToken });
    t.check(r.status === 200 && r.body.email === email && r.body.guest === false, '/api/me returns the signed-in user');

    // ── Protected endpoints ─────────────────────────────────
    t.section('Unauthorized access');
    r = await call('GET', '/api/me');
    t.check(r.status === 401, 'no token → 401');
    r = await call('GET', '/api/me', { token: 'not.a.jwt' });
    t.check(r.status === 401, 'garbage token → 401');
    const [h, p] = aliceToken.split('.');
    const forged = JSON.parse(Buffer.from(p, 'base64url').toString());
    forged.plan = 'elite'; forged.email = 'admin@example.com';
    r = await call('GET', '/api/me', { token: `${h}.${Buffer.from(JSON.stringify(forged)).toString('base64url')}.x` });
    t.check(r.status === 401, 'token with edited claims (forged plan/email) → 401');
    r = await call('GET', '/api/admin/users', { token: aliceToken });
    t.check(r.status === 403, 'regular user cannot reach admin endpoints');

    // ── Logout ──────────────────────────────────────────────
    t.section('Logout & session invalidation');
    const second = (await call('POST', '/api/login', { body: { email, password } })).body.token;
    r = await call('POST', '/api/logout', { token: aliceToken });
    t.check(r.status === 200, 'logout succeeds');
    r = await call('GET', '/api/me', { token: aliceToken });
    t.check(r.status === 401 && r.body?.code === 'SESSION_REVOKED', 'the logged-out token is rejected server-side');
    r = await call('GET', '/api/me', { token: second });
    t.check(r.status === 200, 'logging out one session leaves the other device signed in');

    // ── Forgot / reset password ─────────────────────────────
    t.section('Password recovery');
    const forgotKnown = await call('POST', '/api/auth/forgot', { body: { email } });
    const forgotUnknown = await call('POST', '/api/auth/forgot', { body: { email: 'ghost@example.com' } });
    t.check(forgotKnown.status === 200 && forgotUnknown.status === 200, 'forgot-password answers 200 for known and unknown emails');
    t.check(forgotKnown.body.message === forgotUnknown.body.message, 'the message is identical, so it does not reveal whether an account exists');
    t.check(!/[A-Za-z0-9_-]{40,}/.test(forgotKnown.text), 'no reset token appears in the API response');
    await sleep(800);
    const mails = srv.readOutbox();
    t.check(mails.length === 1 && mails[0].to === email, 'exactly one email went out, to the registered address only');
    const link = (mails[0]?.text || '').match(/https?:\/\/\S+\?reset=([\w%-]+)/);
    t.check(!!link && link[0].startsWith('http://app.test/?reset='), 'email contains a reset link on APP_URL');
    const token = decodeURIComponent(link?.[1] || '');

    const row = db.prepare('SELECT token_hash FROM password_resets ORDER BY id DESC LIMIT 1').get();
    t.check(row && row.token_hash !== token && /^[0-9a-f]{64}$/.test(row.token_hash), 'only a SHA-256 hash of the token is stored');
    t.check(!srv.log().includes(token), 'the raw token never appears in server logs');

    r = await call('POST', '/api/auth/reset', { body: { token, password: 'short' } });
    t.check(r.status === 400, 'reset enforces the password policy');
    r = await call('POST', '/api/auth/reset', { body: { token: 'x'.repeat(43), password: 'brand-new-pass-2' } });
    t.check(r.status === 400, 'an invalid token is rejected');
    r = await call('POST', '/api/auth/reset', { body: { token, password: 'brand-new-pass-2' } });
    t.check(r.status === 200, 'a valid token sets the new password');
    r = await call('POST', '/api/auth/reset', { body: { token, password: 'another-pass-3' } });
    t.check(r.status === 400, 'the same token cannot be used twice');
    r = await call('GET', '/api/me', { token: second });
    t.check(r.status === 401, 'a password reset ends every existing session');
    r = await call('POST', '/api/login', { body: { email, password } });
    t.check(r.status === 401, 'the old password no longer works');
    r = await call('POST', '/api/login', { body: { email, password: 'brand-new-pass-2' } });
    t.check(r.status === 200, 'the new password works');
    const aliceFresh = r.body.token;

    // Expiry: age the newest token past its deadline directly in the DB.
    await call('POST', '/api/auth/forgot', { body: { email } });
    await sleep(800);
    const expLink = (srv.readOutbox().pop()?.text || '').match(/\?reset=([\w%-]+)/);
    const rw = new Database(srv.dbPath);
    rw.prepare('UPDATE password_resets SET expires_at = ? WHERE used_at IS NULL').run(Date.now() - 1000);
    rw.close();
    r = await call('POST', '/api/auth/reset', { body: { token: decodeURIComponent(expLink?.[1] || ''), password: 'expired-pass-4' } });
    t.check(r.status === 400, 'an expired reset token is rejected');

    // ── Guest mode ──────────────────────────────────────────
    t.section('Guest sessions');
    r = await call('POST', '/api/auth/guest', { body: {} });
    t.check(r.status === 201 && r.body.guest === true && r.body.token, 'guest session starts without any personal data');
    const guest = r.body.token;
    r = await call('GET', '/api/me', { token: guest });
    t.check(r.status === 200 && r.body.guest === true && r.body.plan === 'guest' && r.body.limit === 5, '/api/me reports guest mode and its limit');
    const guestId = r.body.id;
    const guestEmail = r.body.email;
    r = await call('POST', '/api/login', { body: { email: guestEmail, password: 'anything-at-all' } });
    t.check(r.status === 401, 'nobody can log into a guest identity with a password');
    r = await call('POST', '/api/auth/forgot', { body: { email: guestEmail } });
    await sleep(500);
    t.check(!srv.readOutbox().some((m) => m.to === guestEmail), 'no reset email is ever sent for a guest identity');

    for (const [method, url, body] of [
      ['GET', '/api/admin/users'], ['GET', '/api/keys'], ['POST', '/api/keys', { name: 'k' }],
      ['POST', '/api/subscribe', { plan: 'pro' }], ['POST', '/api/portal'], ['GET', '/api/workspaces'],
      ['POST', '/api/webhooks', { url: 'https://example.com' }], ['GET', '/api/projects'],
      ['POST', '/api/secrets', { key_name: 'a', value: 'b' }], ['GET', '/api/admin/backups'],
    ]) {
      r = await call(method, url, { token: guest, body });
      t.check(r.status === 403 && r.body?.code === 'GUEST_RESTRICTED', `guest blocked by the server: ${method} ${url}`);
    }

    // Tampering with the token cannot lift guest status: it is read from the DB.
    const [gh, gp] = guest.split('.');
    const gClaims = JSON.parse(Buffer.from(gp, 'base64url').toString());
    delete gClaims.guest; gClaims.plan = 'elite';
    r = await call('GET', '/api/keys', { token: `${gh}.${Buffer.from(JSON.stringify(gClaims)).toString('base64url')}.${guest.split('.')[2]}` });
    t.check(r.status === 401, 'editing the guest token (drop guest flag, set elite) invalidates it');

    // Isolation: a guest sees only its own history, never another user's.
    r = await call('GET', '/api/history', { token: guest });
    t.check(r.status === 200 && Array.isArray(r.body.history) && r.body.history.length === 0, 'guest history is empty, not shared');

    // Budget: the daily guest quota is enforced on the server.
    let lastStatus = 0; let allowed = 0;
    for (let i = 0; i < 7; i++) {
      r = await call('POST', '/api/chat', { token: guest, body: { input: `hello ${i}`, no_rewrite: true } });
      lastStatus = r.status;
      if (r.status !== 429) allowed++;
    }
    t.check(allowed === 5 && lastStatus === 429, `guest quota stops at 5 requests (allowed ${allowed}, then ${lastStatus})`);

    // Per-IP guest creation limit (3/hour by default; one used above).
    const statuses = [];
    for (let i = 0; i < 3; i++) statuses.push((await call('POST', '/api/auth/guest', { body: {} })).status);
    t.check(statuses.slice(0, 2).every((s) => s === 201) && statuses[2] === 429, `guest creation is rate-limited per IP (${statuses.join(',')})`);

    // Expiry and cleanup.
    const rw2 = new Database(srv.dbPath);
    rw2.prepare('UPDATE users SET guest_expires_at = ? WHERE id = ?').run(Date.now() - 1000, guestId);
    rw2.close();
    r = await call('GET', '/api/me', { token: guest });
    t.check(r.status === 401 && r.body?.code === 'GUEST_EXPIRED', 'an expired guest session is rejected');

    // Registered user is unaffected by all of the above.
    r = await call('GET', '/api/me', { token: aliceFresh });
    t.check(r.status === 200 && r.body.guest === false, 'registered user still works after guest activity');

    // ── Realtime socket ─────────────────────────────────────
    t.section('WebSocket authentication');
    const WebSocket = require('ws');
    const wsTalk = (msg) => new Promise((resolve) => {
      const sock = new WebSocket(srv.base.replace('http', 'ws') + '/ws');
      const timer = setTimeout(() => { sock.terminate(); resolve(null); }, 5000);
      sock.on('message', (raw) => {
        const m = JSON.parse(raw.toString());
        if (m.type === 'hello') return sock.send(JSON.stringify(msg));
        clearTimeout(timer); sock.close(); resolve(m);
      });
      sock.on('error', () => { clearTimeout(timer); resolve(null); });
    });
    let m = await wsTalk({ type: 'auth', user_id: 1, email: email });
    t.check(m?.type === 'auth.error', 'socket refuses a bare user_id (no impersonation)');
    m = await wsTalk({ type: 'auth', token: aliceFresh });
    t.check(m?.type === 'auth.ok' && m.user_id === 1, 'socket accepts a valid session token');
    m = await wsTalk({ type: 'auth', token: aliceToken });
    t.check(m?.type === 'auth.error', 'socket refuses a logged-out token');

    // ── Diagnosability ──────────────────────────────────────
    t.section('Errors are diagnosable without leaking secrets');
    r = await call('POST', '/api/login', { body: { email, password: 'wrong-password' } });
    t.check(/^[0-9a-f]{16}$/.test(r.headers.get('x-request-id') || '') && r.body.error, 'every response carries an X-Request-Id');
    const bad = await fetch(srv.base + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 Chrome/120', 'Accept-Language': 'en' }, body: '{"email":' });
    const badBody = await bad.json();
    t.check(bad.status === 400 && /Malformed JSON/.test(badBody.error) && badBody.request_id, 'a malformed JSON body is a 400 with a clear message, not "Internal server error"');

    // Simulated database failure during login (table unavailable).
    const broken = new Database(srv.dbPath);
    broken.prepare('ALTER TABLE users RENAME TO users_offline').run();
    const secretPw = 'Sup3r-Secret-Pa55word!';
    r = await call('POST', '/api/login', { body: { email, password: secretPw } });
    t.check(r.status === 500 && typeof r.body?.error === 'string' && r.body.request_id === r.headers.get('x-request-id'), 'a database failure returns JSON 500 with the request id');
    await sleep(200);
    const logLine = srv.log().split('\n').find((l) => l.includes(r.body.request_id)) || '';
    t.check(/"path":"\/api\/login"/.test(logLine) && /users/.test(logLine), 'the server log has the request id, route and cause');
    t.check(!srv.log().includes(secretPw), 'the password never appears in the logs');
    // A different client IP (the per-IP guest limit was used up above).
    r = await call('POST', '/api/auth/guest', { body: {}, headers: { 'X-Forwarded-For': '198.51.100.9' } });
    t.check(r.status >= 500 && r.body?.request_id, 'guest creation failing on the database also returns a diagnosable JSON error');
    broken.prepare('ALTER TABLE users_offline RENAME TO users').run();
    broken.close();

    r = await call('GET', '/api/auth/config');
    t.check(r.status === 200 && r.body.passwordReset.emailConfigured === true, '/api/auth/config reports email delivery status');
    db.close();
  } catch (e) {
    t.check(false, `suite crashed: ${e.stack}`);
  } finally {
    await srv.stop();
  }

  // Missing configuration: the server refuses to start and names the
  // variable, without printing any secret values.
  t.section('Missing environment');
  const { spawnSync } = require('child_process');
  const out = spawnSync(process.execPath, [require('path').join(__dirname, '..', 'backend', 'server.js')], {
    env: { PATH: process.env.PATH, NODE_ENV: 'test', OPENAI_API_KEY: 'sk-test-dummy', STRIPE_SECRET_KEY: 'sk_test_dummy', STRIPE_WEBHOOK_SECRET: 'whsec_dummy', DB_PATH: require('os').tmpdir() + '/nx-missing-env.db' },
    encoding: 'utf8', timeout: 20000,
  });
  t.check(out.status === 1 && /Missing env: JWT_SECRET/.test(out.stderr + out.stdout), 'missing JWT_SECRET stops startup with a message naming it');
  t.check(!/sk-test-dummy|sk_test_dummy|whsec_dummy/.test(out.stderr + out.stdout), 'no secret values are printed');
  t.done();
})();
