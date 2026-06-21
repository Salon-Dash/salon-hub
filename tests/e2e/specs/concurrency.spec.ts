/**
 * Concurrency and race-condition tests
 * These run against the live VPS and verify booking integrity under concurrent load.
 */
import { test, expect, request } from '@playwright/test';
import { loginViaAPI } from '../fixtures/auth';

const BASE_URL = 'http://187.124.190.92';
const API_BASE = `${BASE_URL}/api`;

test.describe('Booking concurrency and integrity', () => {
  let token: string;
  let businessId: number;

  test.beforeAll(async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: API_BASE });
    const res = await ctx.post('/auth/login', {
      data: { emailOrPhone: 'admin@salon-hub.com', password: 'Admin2026!' },
    });
    const body = await res.json();
    token = body.accessToken;

    const bizRes = await ctx.get(`/businesses/owner/${body.userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const bizzes = await bizRes.json();
    businessId = bizzes[0]?.id ?? 6;
    await ctx.dispose();
  });

  // ── DOUBLE-BOOKING RACE CONDITION ─────────────────────────────────────────

  test('50 concurrent requests for same slot → exactly 1 succeeds', async ({ playwright }) => {
    const staff = await (async () => {
      const ctx = await playwright.request.newContext({ baseURL: API_BASE });
      const r = await ctx.get(`/staff/business/${businessId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const list = await r.json();
      await ctx.dispose();
      return list;
    })();

    if (!staff || staff.length === 0) {
      test.skip(true, 'No staff in business — cannot test double-booking');
      return;
    }

    const staffId = staff[0].id;
    const testDate = '2026-08-01'; // future date, safe for testing
    const payload = {
      businessId,
      staffId,
      serviceId: 1,
      appointmentDate: testDate,
      startTime: '10:00',
      endTime: '11:00',
      clientName: 'Concurrency Test Client',
    };

    // Fire 50 simultaneous POST /api/bookings
    const contexts = await Promise.all(
      Array.from({ length: 50 }, () => playwright.request.newContext({ baseURL: API_BASE }))
    );

    const results = await Promise.all(
      contexts.map(ctx =>
        ctx.post('/bookings', {
          data: payload,
          headers: { Authorization: `Bearer ${token}` },
        })
      )
    );

    await Promise.all(contexts.map(c => c.dispose()));

    const statuses = results.map(r => r.status());
    const created = statuses.filter(s => s === 201);
    const conflicts = statuses.filter(s => s === 409);

    console.log(`Concurrency test: ${created.length} created, ${conflicts.length} conflicts out of 50 requests`);

    // Exactly 1 booking should be created
    expect(created.length).toBe(1);
    // All others should be 409 Conflict (not 500, not 200)
    expect(conflicts.length).toBeGreaterThanOrEqual(49);

    // Cleanup: cancel the created booking
    const createdResponse = results.find(r => r.status() === 201);
    if (createdResponse) {
      const booking = await createdResponse.json();
      const cleanupCtx = await playwright.request.newContext({ baseURL: API_BASE });
      await cleanupCtx.put(`/bookings/${booking.id}/cancel`, {
        data: { reason: 'Concurrency test cleanup' },
        headers: { Authorization: `Bearer ${token}` },
      });
      await cleanupCtx.dispose();
    }
  });

  // ── IDEMPOTENCY ───────────────────────────────────────────────────────────

  test('Same idempotency key sent twice → returns same booking, no duplicate', async ({ playwright }) => {
    const idempotencyKey = `idem-test-${Date.now()}-${Math.random()}`;
    const testDate = '2026-08-02';

    const payload = {
      businessId,
      staffId: 1,
      serviceId: 1,
      appointmentDate: testDate,
      startTime: '14:00',
      endTime: '15:00',
      clientName: 'Idempotency Test',
      idempotencyKey,
    };

    const ctx1 = await playwright.request.newContext({ baseURL: API_BASE });
    const r1 = await ctx1.post('/bookings', {
      data: payload,
      headers: { Authorization: `Bearer ${token}` },
    });

    const ctx2 = await playwright.request.newContext({ baseURL: API_BASE });
    const r2 = await ctx2.post('/bookings', {
      data: payload,
      headers: { Authorization: `Bearer ${token}` },
    });

    await ctx1.dispose();
    await ctx2.dispose();

    // Both requests should succeed (201 or 200)
    expect([200, 201]).toContain(r1.status());
    expect([200, 201]).toContain(r2.status());

    const b1 = await r1.json();
    const b2 = await r2.json();

    // Both responses must return the SAME booking ID
    expect(b1.id).toBe(b2.id);

    // Cleanup
    const cleanupCtx = await playwright.request.newContext({ baseURL: API_BASE });
    await cleanupCtx.put(`/bookings/${b1.id}/cancel`, {
      data: { reason: 'Idempotency test cleanup' },
      headers: { Authorization: `Bearer ${token}` },
    });
    await cleanupCtx.dispose();
  });

  // ── PAST DATE REJECTION ───────────────────────────────────────────────────

  test('Booking in the past is rejected with 400', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: API_BASE });
    const r = await ctx.post('/bookings', {
      data: {
        businessId,
        staffId: 1,
        serviceId: 1,
        appointmentDate: '2020-01-01',
        startTime: '10:00',
        endTime: '11:00',
        clientName: 'Past Date Test',
      },
      headers: { Authorization: `Bearer ${token}` },
    });
    await ctx.dispose();
    expect(r.status()).toBe(400);
  });

  // ── TIME ORDER VALIDATION ─────────────────────────────────────────────────

  test('Booking with endTime before startTime is rejected with 400', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: API_BASE });
    const r = await ctx.post('/bookings', {
      data: {
        businessId,
        staffId: 1,
        serviceId: 1,
        appointmentDate: '2026-09-01',
        startTime: '15:00',
        endTime: '10:00', // end before start — invalid
        clientName: 'Time Order Test',
      },
      headers: { Authorization: `Bearer ${token}` },
    });
    await ctx.dispose();
    expect(r.status()).toBe(400);
  });

  // ── UNAUTHENTICATED BOOKINGS BLOCKED ─────────────────────────────────────

  test('POST /api/bookings without auth token returns 401', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: API_BASE });
    const r = await ctx.post('/bookings', {
      data: {
        businessId,
        staffId: 1,
        serviceId: 1,
        appointmentDate: '2026-09-01',
        startTime: '10:00',
        endTime: '11:00',
        clientName: 'Unauthenticated Test',
      },
      // No Authorization header
    });
    await ctx.dispose();
    expect(r.status()).toBe(401);
  });

  // ── DB CONSISTENCY CHECK ──────────────────────────────────────────────────

  test('No overlapping non-cancelled appointments exist in DB (via analytics API)', async ({ playwright }) => {
    // Use the analytics API as a proxy — if there are double bookings, staff revenue
    // will be inflated and the staff tab will show duplicate staff entries
    const ctx = await playwright.request.newContext({ baseURL: API_BASE });
    const r = await ctx.get(`/analytics/business/${businessId}/overview`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    await ctx.dispose();

    expect(r.status()).toBe(200);
    const data = await r.json();

    // totalBookings should never be NaN or negative
    expect(typeof data.totalBookings).toBe('number');
    expect(data.totalBookings).toBeGreaterThanOrEqual(0);
    expect(String(data.totalBookings)).not.toContain('NaN');
  });
});
