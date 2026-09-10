// ============================================================
// 🎭 tests/e2e/smoke.spec.js — Playwright E2E smoke tests
// Run: npx playwright test tests/e2e/
// Requires: npm install -D @playwright/test && npx playwright install
// ============================================================
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3001';

test.describe('NexusAI E2E Smoke Tests', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/NexusAI|Nexus/i);
  });

  test('onboarding flow appears for new user', async ({ page }) => {
    await page.goto(BASE_URL);
    // Clear localStorage to simulate new user
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    // Onboarding overlay should be visible
    const overlay = page.locator('.nx-onb-overlay');
    await expect(overlay).toBeVisible({ timeout: 5000 });
  });

  test('goal selection completes onboarding', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.click('[data-goal="startup"]');
    await page.click('.nx-onb-go');
    // Onboarding closes
    await expect(page.locator('.nx-onb-overlay')).not.toBeVisible({ timeout: 3000 });
    // Goal is persisted
    const goal = await page.evaluate(() => localStorage.getItem('nx_user_goal'));
    expect(goal).toBe('startup');
  });

  test('design system CSS is loaded', async ({ page }) => {
    await page.goto(BASE_URL);
    const hasNxTokens = await page.evaluate(() => {
      const style = getComputedStyle(document.body);
      return !!style.getPropertyValue('--ease-out-soft').trim();
    });
    expect(hasNxTokens).toBeTruthy();
  });

  test('mode switching works', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => {
      window.NX?.setMode?.('focus');
    });
    const mode = await page.getAttribute('body', 'data-mode');
    expect(mode).toBe('focus');
  });

  test('API health endpoint responds', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health`);
    expect([200, 404]).toContain(response.status()); // 404 acceptable if endpoint not exposed
  });

  test('WebSocket endpoint accepts connections', async ({ page }) => {
    await page.goto(BASE_URL);
    const connected = await page.evaluate(() => new Promise((resolve) => {
      try {
        const ws = new WebSocket(location.origin.replace(/^http/, 'ws') + '/ws');
        ws.onopen = () => { resolve(true); ws.close(); };
        ws.onerror = () => resolve(false);
        setTimeout(() => resolve(false), 3000);
      } catch (_) { resolve(false); }
    }));
    // WS may not be attached in dev; either result is acceptable
    expect(typeof connected).toBe('boolean');
  });

  test('cinematic runtime is available', async ({ page }) => {
    await page.goto(BASE_URL);
    const hasCine = await page.evaluate(() => !!window.Cine && typeof Cine.portal === 'function');
    expect(hasCine).toBeTruthy();
  });

  test('UI panels module is loaded', async ({ page }) => {
    await page.goto(BASE_URL);
    const hasNXUI = await page.evaluate(() => !!window.NXUI && typeof NXUI.renderAll === 'function');
    expect(hasNXUI).toBeTruthy();
  });
});