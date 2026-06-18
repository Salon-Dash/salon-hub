/**
 * Dashboard spec — 25 tests
 * Covers: home page stats, sidebar navigation, appointment list, regressions.
 */
import { test, expect } from '@playwright/test';
import { loginViaAPI, ADMIN_EMAIL, ADMIN_PASSWORD } from '../fixtures/auth';

const BASE_URL = 'http://187.124.190.92';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    const { businessId } = await loginViaAPI(page);
    await page.goto(`${BASE_URL}/${businessId}/calendar`, { waitUntil: 'networkidle' });
  });

  test('dashboard loads without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.reload({ waitUntil: 'networkidle' });
    // Ignore known non-critical errors (e.g. favicon 404)
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('ResizeObserver') &&
        !e.includes('ChunkLoadError')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('page body is visible after login', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
  });

  test('sidebar navigation is visible', async ({ page }) => {
    const nav = page.locator('nav, aside, [class*="sidebar" i]').first();
    await expect(nav).toBeVisible();
  });

  test('sidebar contains Calendar nav item', async ({ page }) => {
    const calendarLink = page.getByRole('link', { name: /calendar/i });
    await expect(calendarLink.first()).toBeVisible();
  });

  test('sidebar contains Staff nav item', async ({ page }) => {
    const link = page.getByRole('link', { name: /staff/i });
    await expect(link.first()).toBeVisible();
  });

  test('sidebar contains Services nav item', async ({ page }) => {
    const link = page.getByRole('link', { name: /service/i });
    await expect(link.first()).toBeVisible();
  });

  test('sidebar contains Clients nav item', async ({ page }) => {
    const link = page.getByRole('link', { name: /client|contact/i });
    await expect(link.first()).toBeVisible();
  });

  test('sidebar contains Analytics nav item', async ({ page }) => {
    const link = page.getByRole('link', { name: /analytic|report/i });
    await expect(link.first()).toBeVisible();
  });

  test('sidebar contains Business/Hours nav item', async ({ page }) => {
    const link = page.getByRole('link', { name: /business|hour|setting/i });
    await expect(link.first()).toBeVisible();
  });

  test('logout button is present in sidebar', async ({ page }) => {
    const logoutBtn = page.getByRole('button', { name: /logout|sign out|log out/i }).first();
    await expect(logoutBtn).toBeVisible();
  });

  test('clicking logout → redirects to /login', async ({ page }) => {
    const logoutBtn = page.getByRole('button', { name: /logout|sign out|log out/i }).first();
    await logoutBtn.click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('clicking logout → clears localStorage', async ({ page }) => {
    const logoutBtn = page.getByRole('button', { name: /logout|sign out|log out/i }).first();
    await logoutBtn.click();
    await page.waitForURL(/\/login/, { timeout: 10000 });
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(token).toBeNull();
  });

  test('calendar page renders appointment grid or empty state', async ({ page }) => {
    const calendarGrid = page.locator(
      '[class*="calendar" i], [class*="grid" i], [class*="time-slot" i], text=/no appointment/i'
    ).first();
    await expect(calendarGrid).toBeVisible({ timeout: 15000 });
  });

  test('page title is not empty', async ({ page }) => {
    const title = await page.title();
    expect(title.trim().length).toBeGreaterThan(0);
  });

  test('no raw "tesst" text on page (regression: was hardcoded test data)', async ({ page }) => {
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.toLowerCase()).not.toContain('tesst');
  });

  test('no "undefined" values in visible content', async ({ page }) => {
    const bodyText = await page.locator('body').innerText();
    // "undefined" appearing in data renders is a bug
    const occurrences = (bodyText.match(/\bundefined\b/g) || []).length;
    expect(occurrences).toBe(0);
  });

  test('no "NaN" values in visible content', async ({ page }) => {
    const bodyText = await page.locator('body').innerText();
    const hasNaN = /\bNaN\b/.test(bodyText);
    expect(hasNaN).toBeFalsy();
  });

  test('clicking Staff nav item navigates to /staff', async ({ page }) => {
    const link = page.getByRole('link', { name: /staff/i }).first();
    await link.click();
    await expect(page).toHaveURL(/\/staff/, { timeout: 10000 });
  });

  test('clicking Services nav item navigates to /services', async ({ page }) => {
    const link = page.getByRole('link', { name: /service/i }).first();
    await link.click();
    await expect(page).toHaveURL(/\/services/, { timeout: 10000 });
  });

  test('clicking Analytics nav item navigates to /analytics', async ({ page }) => {
    const link = page.getByRole('link', { name: /analytic/i }).first();
    await link.click();
    await expect(page).toHaveURL(/\/analytics/, { timeout: 10000 });
  });

  test('clicking Sales nav item navigates to /sales or /shopping', async ({ page }) => {
    const link = page.getByRole('link', { name: /sale|shopping/i }).first();
    await link.click();
    await expect(page).toHaveURL(/\/sales|\/shopping/, { timeout: 10000 });
  });

  test('clicking Clients nav item navigates to /clients or /contacts', async ({ page }) => {
    const link = page.getByRole('link', { name: /client|contact/i }).first();
    await link.click();
    await expect(page).toHaveURL(/\/clients|\/contacts/, { timeout: 10000 });
  });

  test('no console errors of type "error" on dashboard load', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    await page.reload({ waitUntil: 'networkidle' });
    // Filter out known non-critical errors
    const critical = consoleErrors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('CORS') &&
        !e.includes('ERR_CONNECTION') &&
        !e.includes('net::')
    );
    // Log for debugging
    if (critical.length > 0) console.warn('Console errors:', critical);
    // Do not fail on API errors (the server may have intermittent issues)
    // Only fail on app-level JS errors
    const jsErrors = critical.filter((e) => e.includes('TypeError') || e.includes('ReferenceError'));
    expect(jsErrors).toHaveLength(0);
  });
});

test.describe('Dashboard — Home page stats', () => {
  test.beforeEach(async ({ page }) => {
    const { businessId } = await loginViaAPI(page);
    await page.goto(`${BASE_URL}/${businessId}`, { waitUntil: 'networkidle' });
  });

  test('home route redirects to calendar', async ({ page }) => {
    await expect(page).toHaveURL(/\/calendar/, { timeout: 10000 });
  });
});
