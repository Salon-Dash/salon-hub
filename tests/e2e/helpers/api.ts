import { APIRequestContext, request } from '@playwright/test';

const BASE_URL = 'http://187.124.190.92';
const API_BASE = `${BASE_URL}/api`;

export interface ApiHelper {
  get<T = unknown>(path: string): Promise<T>;
  post<T = unknown>(path: string, body?: unknown): Promise<T>;
  put<T = unknown>(path: string, body?: unknown): Promise<T>;
  delete<T = unknown>(path: string): Promise<T>;
}

export async function createApiHelper(accessToken: string): Promise<ApiHelper> {
  const ctx: APIRequestContext = await request.newContext({
    baseURL: API_BASE,
    extraHTTPHeaders: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  return {
    async get<T>(path: string): Promise<T> {
      const res = await ctx.get(path);
      if (!res.ok()) throw new Error(`GET ${path} → ${res.status()}`);
      return res.json();
    },
    async post<T>(path: string, body?: unknown): Promise<T> {
      const res = await ctx.post(path, { data: body });
      if (!res.ok()) throw new Error(`POST ${path} → ${res.status()}`);
      return res.json();
    },
    async put<T>(path: string, body?: unknown): Promise<T> {
      const res = await ctx.put(path, { data: body });
      if (!res.ok()) throw new Error(`PUT ${path} → ${res.status()}`);
      return res.json();
    },
    async delete<T>(path: string): Promise<T> {
      const res = await ctx.delete(path);
      if (!res.ok()) throw new Error(`DELETE ${path} → ${res.status()}`);
      // 204 No Content returns empty body
      const text = await res.text();
      return (text ? JSON.parse(text) : {}) as T;
    },
  };
}

/**
 * Login via API and return tokens + businessId.
 */
export async function apiLogin(email: string, password: string): Promise<{
  accessToken: string;
  refreshToken: string;
  businessId: number;
}> {
  const ctx = await request.newContext({ baseURL: API_BASE });

  let res = await ctx.post('/auth/login', {
    data: { email, password },
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok()) {
    // fallback
    res = await ctx.post('/public/auth/login', {
      data: { emailOrPhone: email, password },
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!res.ok()) {
    throw new Error(`API login failed: ${res.status()} ${await res.text()}`);
  }

  const data = await res.json();
  const businessId: number = data.business?.id ?? 0;
  return { accessToken: data.accessToken, refreshToken: data.refreshToken, businessId };
}
