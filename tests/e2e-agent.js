// ============================================================
// Browser test of the agent panel against the real server: run a goal,
// watch plan → steps → verification → result, approve/reject an
// external action, and confirm model output cannot inject HTML/JS.
// ============================================================
const { chromium } = require('@playwright/test');
const { startServer, makeRunner } = require('./helpers/harness');

let planMode = 'calc';
const PLANS = {
  calc: { interpretation: 'Multiply two numbers', unknowns: [], steps: [{ title: 'Multiply', tool: 'calculate', args: { expression: '6*7' }, success_criteria: 'a number' }] },
  post: { interpretation: 'Notify a webhook', steps: [{ title: 'Notify webhook', tool: 'http_post', args: { url: 'https://hooks.example.com/x', body: { done: true } } }] },
};

(async () => {
  const t = makeRunner('🖥️  Agent panel (Chromium against the real server)');
  const srv = await startServer({
    port: 3001,
    env: { RESEARCH_WIKIPEDIA: 'off' },
    llmRules: [
      { match: 'You are the Planner of an autonomous agent', reply: () => JSON.stringify(PLANS[planMode]) },
      { match: 'You are the Validator', reply: JSON.stringify({ satisfied: true, reason: 'ok' }) },
      { match: 'You are the Analyst', reply: 'The product is 42. <img src=x onerror="window.__xss=1"><script>window.__xss=2</script>' },
      { match: 'You distil one reusable', reply: JSON.stringify({ lesson: 'Use the calculate tool for arithmetic instead of estimating.', applies_when: 'arithmetic' }) },
    ],
  });
  let browser;
  try {
    await srv.call('POST', '/api/signup', { body: { email: 'ui@example.com', password: 'ui-password-1' } });
    const token = (await srv.call('POST', '/api/login', { body: { email: 'ui@example.com', password: 'ui-password-1' } })).body.token;
    browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript((tok) => {
      localStorage.setItem('nx_t', tok);
      localStorage.setItem('nx_intro_seen', '1');
      localStorage.setItem('nx_tour_completed', '1');
      localStorage.setItem('nx_onboarded_v2', 'skipped');
    }, token);
    await page.goto(srv.base + '/');
    await page.waitForSelector('#app', { state: 'visible' });

    t.section('Run a goal and watch it');
    await page.click('.nxs-rail-btn[data-area="agent"]');
    await page.waitForSelector('#nx-agent:not([hidden])');
    t.check(await page.isVisible('#nxa-goal'), 'the agent panel opens from the Agent rail button');
    await page.waitForFunction(() => document.getElementById('nxa-inference').textContent.length > 0);
    t.check(/Models: openai/.test(await page.textContent('#nxa-inference')), `the panel states which models will be used ("${await page.textContent('#nxa-inference')}")`);
    await page.fill('#nxa-goal', 'What is six times seven?');
    await page.click('#nxa-run');
    await page.waitForFunction(() => /Completed and verified|Failed|Stopped/.test(document.getElementById('nxa-status').textContent), null, { timeout: 30000 });
    t.check((await page.textContent('#nxa-status')).startsWith('Completed and verified'), `status reaches "Completed and verified" (${await page.textContent('#nxa-status')})`);
    t.check(await page.locator('.nxa-steps li.succeeded').count() === 1, 'the plan step is shown as succeeded');
    t.check((await page.textContent('.nxa-answer')).includes('The product is 42'), 'the deliverable is displayed');
    t.check(await page.locator('.nxa-check.ok').count() >= 2, 'verification checks are displayed');
    t.check(/plan\.created/.test(await page.textContent('.nxa-log')) && /step\.succeeded/.test(await page.textContent('.nxa-log')), 'the activity log shows the execution events');

    t.section('Untrusted model output');
    t.check(await page.evaluate(() => window.__xss === undefined), 'HTML/JS in model output did not execute');
    t.check((await page.textContent('.nxa-answer')).includes('<img src=x'), 'it is shown as inert text');

    t.section('Reviewed learning');
    await page.waitForSelector('[data-lesson][data-status="approved"]');
    await page.click('[data-lesson][data-status="approved"]');
    await page.waitForFunction(() => /Lesson approved/.test(document.querySelector('[id^="nxa-lesson-"]')?.textContent || ''));
    const lessons = await srv.call('GET', '/api/agent/lessons?status=approved', { token });
    t.check(lessons.body.lessons.length === 1, 'approving the proposed lesson in the UI stores it as approved');

    t.section('Approval for an external action');
    planMode = 'post';
    await page.fill('#nxa-goal', 'Tell my webhook the job is done');
    await page.click('#nxa-run');
    await page.waitForSelector('.nxa-approve', { timeout: 30000 });
    t.check((await page.textContent('.nxa-approve')).includes('hooks.example.com'), 'the exact action awaiting approval is shown');
    await page.click('[data-decide="reject"]');
    await page.waitForFunction(() => /Completed|Failed|Stopped/.test(document.getElementById('nxa-status').textContent), null, { timeout: 30000 });
    t.check(await page.locator('.nxa-steps li.rejected').count() === 1, 'after rejecting, the step is shown as rejected and the run ends');

    t.check(errors.length === 0, `no uncaught page errors (${errors.slice(0, 3).join(' | ') || 'none'})`);
  } catch (e) {
    t.check(false, `suite crashed: ${e.stack}`);
  } finally {
    await browser?.close();
    await srv.stop();
  }
  t.done();
})();
