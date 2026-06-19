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
 * Login via the API, inject tokens into localStorage, and resolve businessId.
 * Auth response shape: { accessToken, refreshToken, userId, fullName, email, role }
 * (no nested user/business objects — must fetch business separately)
 */
export async function loginViaAPI(page: Page): Promise<{ businessId: number }> {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

  const authData = await page.evaluate(
    async ({ apiBase, email, password }: { apiBase: string; email: string; password: string }) => {
      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error(`Login failed with status ${res.status}`);
      return res.json();
    },
    { apiBase: API_BASE, email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
  );

  const { accessToken, refreshToken, userId, fullName, email, role } = authData;

  // Fetch business for this user
  const businesses: any[] = await page.evaluate(
    async ({ apiBase, token, uid }: { apiBase: string; token: string; uid: number }) => {
      const res = await fetch(`${apiBase}/businesses/owner/${uid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    { apiBase: API_BASE, token: accessToken, uid: userId }
  );

  const business = businesses[0] ?? null;
  const businessId: number = business?.id ?? 0;

  await page.evaluate(
    (data: {
      accessToken: string;
      refreshToken: string;
      userId: number;
      fullName: string;
      email: string;
      role: string;
      business: any;
      businessId: number;
    }) => {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify({
        id: data.userId,
        fullName: data.fullName,
        email: data.email,
        role: data.role,
      }));
      if (data.business) {
        localStorage.setItem('currentBusiness', JSON.stringify(data.business));
        localStorage.setItem('currentBusinessId', String(data.businessId));
      }
    },
    { accessToken, refreshToken, userId, fullName, email, role, business, businessId }
  );

  return { businessId };
}

export const test = base.extend<AuthFixtures>({
  authedPage: async ({ page }, use) => {
    const { businessId } = await loginViaAPI(page);
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await use(page);
  },
  businessId: async ({ page }, use) => {
    const { businessId } = await loginViaAPI(page);
    await use(businessId);
  },
});

export { expect } from '@playwright/test';
