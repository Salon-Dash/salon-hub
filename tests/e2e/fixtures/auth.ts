import { test as base, type Page } from '@playwright/test';

export const ADMIN_EMAIL = 'admin@salon-hub.com';
export const ADMIN_PASSWORD = 'Admin2026!';
export const BASE_URL = 'http://187.124.190.92';
const API_BASE = `${BASE_URL}/api`;

export interface AuthFixtures {
  authedPage: Page;
  businessId: number;
}

/**
 * Perform a login via the API and inject tokens into localStorage,
 * then navigate to `/` so the app initialises with a valid session.
 */
export async function loginViaAPI(page: Page): Promise<{ businessId: number }> {
  // Navigate to the app first so localStorage is accessible on the right origin
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

  const response = await page.evaluate(
    async ({ apiBase, email, password }: { apiBase: string; email: string; password: string }) => {
      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        // Try fallback
        const fb = await fetch(`${apiBase}/public/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emailOrPhone: email, password }),
        });
        if (!fb.ok) throw new Error(`Login failed: ${fb.status}`);
        return fb.json();
      }
      return res.json();
    },
    { apiBase: API_BASE, email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
  );

  const { accessToken, refreshToken, user, business } = response;

  await page.evaluate(
    ({ accessToken, refreshToken, user, business }: {
      accessToken: string;
      refreshToken: string;
      user: unknown;
      business: unknown;
    }) => {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      if (business && (business as any).id) {
        localStorage.setItem('currentBusinessId', String((business as any).id));
        localStorage.setItem('currentBusiness', JSON.stringify(business));
      }
    },
    { accessToken, refreshToken, user, business }
  );

  const businessId: number =
    business?.id ??
    parseInt((await page.evaluate(() => localStorage.getItem('currentBusinessId') ?? '0')), 10);

  return { businessId };
}

export const test = base.extend<AuthFixtures>({
  authedPage: async ({ page }, use) => {
    await loginViaAPI(page);
    // Navigate to home — app will redirect to /:businessId/calendar
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await use(page);
  },
  businessId: async ({ page }, use) => {
    const { businessId } = await loginViaAPI(page);
    await use(businessId);
  },
});

export { expect } from '@playwright/test';
