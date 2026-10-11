// ============================================================
// Browser test of the real login page (served by the real backend):
// password visibility toggle, form validation, loading/error states,
// forgot → email → reset, guest mode, logout and expired sessions.
//
// Uses the installed Chromium. Set CHROMIUM_PATH to override the
// executable (e.g. /opt/pw-browsers/chromium) if Playwright's bundled
// revision is not installed.
// ============================================================
const { chromium } = require('@playwright/test');
const Database = require('better-sqlite3');
const { startServer, makeRunner, sleep } = require('./helpers/harness');

(async () => {
  const t = makeRunner('🖥️  Login UI (Chromium against the real server)');
  // Port 3001: app.js sends API calls from any other localhost port to
  // :3001 (its Live Server dev convention), so the page must be served there.
  const srv = await startServer({ port: 3001, llmRules: [{ match: /./, reply: 'Hello from the test model.' }] });
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); // phone-sized
    const consoleErrors = [];
    page.on('pageerror', (e) => consoleErrors.push(e.message));
    await page.addInitScript(() => {
      localStorage.setItem('nx_intro_seen', '1');
      localStorage.setItem('nx_tour_completed', '1');
      localStorage.setItem('nx_onboarded_v2', 'skipped');
    });
    await page.goto(srv.base + '/');
    await page.waitForSelector('#auth-form');

    t.section('Password visibility toggle');
    const pw = page.locator('#auth-password');
    const toggle = page.locator('#auth-view-credentials .auth-pw-toggle');
    t.check(await pw.getAttribute('type') === 'password', 'password is masked by default');
    t.check(await toggle.getAttribute('aria-label') === 'Show password', 'toggle has an accessible "Show password" label');
    await pw.fill('s3cret-value!');
    await toggle.click();
    t.check(await pw.getAttribute('type') === 'text', 'clicking the eye shows the password');
    t.check(await toggle.getAttribute('aria-pressed') === 'true' && await toggle.getAttribute('aria-label') === 'Hide password', 'icon state and label switch to "Hide password"');
    t.check(await pw.inputValue() === 's3cret-value!', 'the typed value is kept when shown');
    await toggle.click();
    t.check(await pw.getAttribute('type') === 'password' && await pw.inputValue() === 's3cret-value!', 'clicking again hides it, value still intact');
    t.check(await page.locator('#auth-overlay').isVisible(), 'toggling never submits the form');
    await toggle.focus(); await page.keyboard.press('Enter');
    t.check(await pw.getAttribute('type') === 'text', 'toggle works from the keyboard');
    await toggle.click();

    t.section('Validation & errors');
    await page.fill('#auth-email', 'not-an-email');
    await page.click('#auth-btn');
    t.check((await page.textContent('#auth-email-err')).includes('valid email'), 'invalid email shows an inline message');
    t.check(await page.getAttribute('#auth-email', 'aria-invalid') === 'true', 'the field is marked aria-invalid');
    await page.fill('#auth-email', 'bob@example.com');
    await page.fill('#auth-password', 'wrong-password-1');
    await page.click('#auth-btn');
    await page.waitForFunction(() => document.getElementById('auth-error').textContent.length > 0);
    t.check((await page.textContent('#auth-error')) === 'Invalid email or password.', 'wrong credentials show the server message');

    t.section('Sign up & sign in');
    await page.click('#tab-signup');
    t.check(!(await page.isVisible('#auth-forgot-link')), '"Forgot password?" is hidden on the sign-up tab');
    await page.fill('#auth-password', 'bob-password-1');
    await page.press('#auth-password', 'Enter');
    await page.waitForSelector('#app', { state: 'visible', timeout: 15000 });
    t.check(await page.isVisible('#app') && !(await page.isVisible('#auth-overlay')), 'Enter submits; account is created and the app opens');
    t.check(await page.isHidden('#guest-pill'), 'no guest indicator for a registered user');

    t.section('Logout');
    const tokenBefore = await page.evaluate(() => localStorage.getItem('nx_t'));
    // First-run onboarding used to stay on top of the sign-in form after
    // logout, making it unclickable.
    await page.evaluate(() => { const d = document.createElement('div'); d.className = 'nx-onb-overlay'; document.body.appendChild(d); });
    await page.evaluate(() => logout());
    await page.waitForSelector('#auth-overlay', { state: 'visible' });
    t.check(await page.locator('.nx-onb-overlay').count() === 0, 'logout removes overlays that would cover the sign-in form');
    t.check(await page.evaluate(() => localStorage.getItem('nx_t')) === null, 'logout clears the stored token');
    const after = await srv.call('GET', '/api/me', { token: tokenBefore });
    t.check(after.status === 401, 'and the server no longer accepts it');

    t.section('Forgot & reset password');
    await page.click('#tab-login');
    await page.click('#auth-forgot-link');
    t.check(await page.isVisible('#auth-view-forgot'), '"Forgot password?" opens the recovery form');
    await page.fill('#forgot-email', 'bob@example.com');
    await page.click('#forgot-btn');
    await page.waitForFunction(() => document.getElementById('forgot-msg').textContent.length > 0);
    t.check((await page.textContent('#forgot-msg')).startsWith('If an account exists'), 'shows the neutral confirmation');
    await sleep(800);
    const mail = srv.readOutbox().find((m) => m.to === 'bob@example.com');
    const resetToken = decodeURIComponent((mail?.text.match(/\?reset=([\w%-]+)/) || [])[1] || '');
    t.check(!!resetToken, 'a reset email was produced for the account');
    await page.goto(`${srv.base}/?reset=${encodeURIComponent(resetToken)}`);
    await page.waitForSelector('#auth-view-reset', { state: 'visible' });
    t.check(!page.url().includes('reset='), 'the token is removed from the address bar immediately');
    await page.fill('#reset-password', 'bob-new-pass-2');
    await page.fill('#reset-password2', 'bob-new-pass-X');
    await page.click('#reset-btn');
    t.check((await page.textContent('#reset-error')).includes("don't match"), 'mismatched confirmation is caught');
    await page.fill('#reset-password2', 'bob-new-pass-2');
    await page.click('#reset-btn');
    await page.waitForSelector('#auth-view-credentials', { state: 'visible' });
    await page.fill('#auth-email', 'bob@example.com');
    await page.fill('#auth-password', 'bob-new-pass-2');
    await page.click('#auth-btn');
    await page.waitForSelector('#app', { state: 'visible', timeout: 15000 });
    t.check(true, 'signed in with the new password through the UI');

    t.section('Expired session handling');
    const db = new Database(srv.dbPath);
    db.prepare("UPDATE users SET token_version = token_version + 1 WHERE email = 'bob@example.com'").run();
    db.close();
    await page.evaluate(() => api('/api/me').catch(() => {}));
    await page.waitForSelector('#auth-overlay', { state: 'visible' });
    t.check((await page.textContent('#auth-error')).includes('session has ended'), 'a revoked session returns the user to sign-in with an explanation');

    t.section('Guest mode');
    t.check(await page.isVisible('#auth-guest-btn'), '"Continue as Guest" is offered');
    await page.click('#auth-guest-btn');
    await page.waitForSelector('#app', { state: 'visible', timeout: 15000 });
    t.check(await page.isVisible('#guest-pill'), 'the Guest Mode indicator is shown');
    t.check((await page.textContent('#sb-email')) === 'Guest', 'no fake identity is displayed');
    const guestToken = await page.evaluate(() => localStorage.getItem('nx_t'));
    const blocked = await srv.call('GET', '/api/keys', { token: guestToken });
    t.check(blocked.status === 403, 'the browser guest session is restricted by the server');
    await page.evaluate(() => localStorage.setItem('nx_plan_override', 'elite'));
    const stillBlocked = await srv.call('GET', '/api/workspaces', { token: guestToken });
    t.check(stillBlocked.status === 403, 'client-side flags cannot lift guest restrictions');
    await page.click('.guest-pill-cta');
    await page.waitForSelector('#auth-overlay', { state: 'visible' });
    t.check(await page.getAttribute('#tab-signup', 'aria-selected') === 'true', '"Sign up" from guest mode opens the sign-up form');

    t.check(consoleErrors.length === 0, `no uncaught page errors (${consoleErrors.slice(0, 3).join(' | ') || 'none'})`);
  } catch (e) {
    t.check(false, `suite crashed: ${e.stack}`);
  } finally {
    await browser?.close();
    await srv.stop();
  }
  t.done();
})();
