import Constants from 'expo-constants';
import { Platform } from 'react-native';

function resolveApiBase() {
  const envBase = process.env.EXPO_PUBLIC_API_BASE;
  if (typeof envBase === 'string' && envBase.trim().length > 0) {
    return envBase.trim();
  }
  // Default to API Gateway for all local environments.
  if (Platform.OS === 'web') return 'http://localhost:8080';
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.manifest2?.extra?.expoGo?.debuggerHost ??
    Constants.manifest?.debuggerHost ??
    '';
  const host = typeof hostUri === 'string' ? hostUri.split(':')[0] : '';
  if (host) return `http://${host}:8080`;
  return 'http://localhost:8080';
}

const API_BASE = resolveApiBase();

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

async function request<T>(path: string, method: HttpMethod, body?: unknown, token?: string): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    if (!response.ok) {
      let message = `Request failed (${response.status})`;
      try {
        const json = (await response.json()) as { message?: string; error?: string };
        message = json.message ?? json.error ?? message;
      } catch {
        // no-op
      }
      throw new Error(message);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function requestWithFallback<T>(
  paths: string[],
  method: HttpMethod,
  body?: unknown,
  token?: string
): Promise<T> {
  let lastError: Error | null = null;
  for (const path of paths) {
    try {
      return await request<T>(path, method, body, token);
    } catch (error) {
      lastError = error as Error;
    }
  }
  throw (lastError ?? new Error('Request failed'));
}

async function requestFirstNonEmptyArray(paths: string[]): Promise<unknown[]> {
  let lastError: Error | null = null;
  let firstSuccessfulEmpty: unknown[] | null = null;

  for (const path of paths) {
    try {
      const payload = await request<unknown>(path, 'GET');
      if (Array.isArray(payload)) {
        if (payload.length > 0) return payload;
        if (!firstSuccessfulEmpty) firstSuccessfulEmpty = payload;
        continue;
      }
      return payload as unknown[];
    } catch (error) {
      lastError = error as Error;
    }
  }

  if (firstSuccessfulEmpty) return firstSuccessfulEmpty;
  throw (lastError ?? new Error('Request failed'));
}

export type CustomerAuthResponse = {
  token: string;
  customerId: number;
  fullName: string;
  email: string;
};

export type PublicSalon = {
  id: number;
  name: string;
  businessAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  minPrice?: number | null;
  hasTeam?: boolean;
  hasReviews?: boolean;
};

export type PublicService = {
  id: number;
  name: string;
  durationMinutes: number;
  price: number;
  description: string | null;
  serviceType: string;
  category?: string | null;
  priceType?: 'FIXED' | 'FROM' | 'RANGE' | string | null;
  mobileService?: boolean | null;
  virtualAppointment?: boolean | null;
  // Processing time (minutes): extra client-visit time after the active work
  // where the staff is free. durationMinutes = active/staff-busy time.
  processingDuring?: number | null;
  processingAfter?: number | null;
};

export type PublicStaff = {
  id: number;
  fullName: string;
  role: string;
};

export type SalonServicesResponse = {
  services: PublicService[];
  staff: PublicStaff[];
};

export type PublicReview = {
  id: number;
  author: string;
  text: string;
};

export type PublicSalonProfile = {
  id: number;
  name: string;
  businessAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  about: string;
  phone: string | null;
  website: string | null;
  category: string | null;
  services: PublicService[];
  staff: PublicStaff[];
  reviews: PublicReview[];
};

export type CustomerBooking = {
  id: number;
  companyId: number;
  companyName: string;
  serviceId: number | null;
  serviceName: string | null;
  staffId: number | null;
  staffName: string | null;
  price?: number | null;
  startAt: string;
  endAt: string;
  status: string;
};

type AppointmentApiItem = {
  id?: number;
  businessId?: number;
  companyId?: number;
  businessName?: string | null;
  companyName?: string | null;
  staffId?: number | null;
  staffName?: string | null;
  serviceId?: number | null;
  serviceName?: string | null;
  clientName?: string | null;
  price?: number | null;
  appointmentDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  status?: string | null;
};

export type AvailabilityResponse = {
  occupiedSlotsUtc: string[];
};

export type DailySlotsResponse = {
  serviceId: number;
  date: string;
  durationMinutes: number;
  availableSlots: string[]; // real bookable start times, "HH:mm"
};

export type BusinessHoursItem = {
  id: number;
  businessId: number;
  dayOfWeek: string;
  enabled: boolean;
  startTime: string | null;
  endTime: string | null;
};

function normalizeSalons(payload: PublicSalon[] | unknown): PublicSalon[] {
  return Array.isArray(payload) ? payload : [];
}

function normalizeStudioSalons(payload: unknown): PublicSalon[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .map((item: any): PublicSalon | null => {
      const id = Number(item?.id ?? item?.studioId ?? item?.businessId);
      if (!Number.isFinite(id)) return null;
      return {
        id,
        name: String(item?.name ?? item?.studioName ?? item?.businessName ?? 'Salon'),
        businessAddress: item?.businessAddress ?? item?.address ?? null,
        latitude: typeof item?.latitude === 'number' ? item.latitude : null,
        longitude: typeof item?.longitude === 'number' ? item.longitude : null,
        minPrice: typeof item?.minPrice === 'number' ? item.minPrice : null,
        hasTeam: Boolean(item?.hasTeam),
        hasReviews: Boolean(item?.hasReviews),
      };
    })
    .filter((item): item is PublicSalon => item !== null);
}

function normalizeSalonServices(payload: unknown): SalonServicesResponse {
  const data = payload as any;
  if (Array.isArray(data)) {
    return {
      services: data as PublicService[],
      staff: [],
    };
  }
  return {
    services: Array.isArray(data?.services) ? data.services : [],
    staff: Array.isArray(data?.staff) ? data.staff : [],
  };
}

function normalizeSalonProfile(payload: unknown, companyId: number): PublicSalonProfile {
  const data = payload as any;
  return {
    id: Number(data?.id ?? data?.studioId ?? companyId),
    name: String(data?.name ?? data?.studioName ?? data?.businessName ?? 'Salon'),
    businessAddress: data?.businessAddress ?? data?.address ?? null,
    latitude: typeof data?.latitude === 'number' ? data.latitude : null,
    longitude: typeof data?.longitude === 'number' ? data.longitude : null,
    about: String(data?.about ?? ''),
    phone: typeof data?.phone === 'string' ? data.phone : null,
    website: typeof data?.website === 'string' ? data.website : null,
    category: typeof data?.category === 'string' ? data.category : null,
    services: Array.isArray(data?.services) ? data.services : [],
    staff: Array.isArray(data?.staff) ? data.staff : [],
    reviews: Array.isArray(data?.reviews) ? data.reviews : [],
  };
}

function normalizeCustomerAuthResponse(payload: unknown, fallback?: { fullName?: string; email?: string }): CustomerAuthResponse {
  const data = payload as any;
  const user = (data?.user ?? {}) as any;
  const firstName = typeof user?.firstName === 'string' ? user.firstName.trim() : '';
  const lastName = typeof user?.lastName === 'string' ? user.lastName.trim() : '';
  const fullNameFromUser = `${firstName} ${lastName}`.trim();
  const fallbackFullName = fallback?.fullName?.trim() ?? '';
  const fullName = fullNameFromUser || fallbackFullName || 'Customer';
  const email =
    (typeof user?.email === 'string' && user.email.trim()) ||
    (fallback?.email?.trim() ?? '');
  const token =
    (typeof data?.token === 'string' && data.token.trim()) ||
    (typeof data?.accessToken === 'string' && data.accessToken.trim()) ||
    '';
  // The auth-service returns the id as `userId`; also accept `customerId`/`user.id`.
  const idCandidate = [data?.customerId, data?.userId, data?.id, user?.id]
    .map((v) => Number(v))
    .find((n) => Number.isFinite(n) && n > 0);
  const customerId = idCandidate ?? 0;

  if (!token) throw new Error('Authentication token missing in response.');
  if (!customerId) throw new Error('Customer id missing in response.');

  return {
    token,
    customerId,
    fullName,
    email,
  };
}

function toTimePart(isoLike: string): string {
  const parsed = new Date(isoLike);
  if (!Number.isNaN(parsed.getTime())) {
    const hh = String(parsed.getHours()).padStart(2, '0');
    const mm = String(parsed.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}:00`;
  }
  const timeMatch = isoLike.match(/T(\d{2}:\d{2})(?::\d{2})?/);
  if (timeMatch) return `${timeMatch[1]}:00`;
  return '09:00:00';
}

function normalizeCustomerBooking(payload: unknown, fallback?: { companyId?: number; companyName?: string }): CustomerBooking {
  const data = payload as AppointmentApiItem;
  const id = Number(data?.id ?? 0);
  if (!id) throw new Error('Booking id missing in response.');

  const companyId = Number(data?.companyId ?? data?.businessId ?? fallback?.companyId ?? 0);
  const serviceId = data?.serviceId ?? null;
  const staffId = data?.staffId ?? null;
  const date = typeof data?.appointmentDate === 'string' && data.appointmentDate ? data.appointmentDate : null;
  const startAt =
    (typeof data?.startAt === 'string' && data.startAt) ||
    (date && typeof data?.startTime === 'string' && data.startTime
      ? new Date(`${date}T${data.startTime}`).toISOString()
      : new Date().toISOString());
  const endAt =
    (typeof data?.endAt === 'string' && data.endAt) ||
    (date && typeof data?.endTime === 'string' && data.endTime
      ? new Date(`${date}T${data.endTime}`).toISOString()
      : startAt);

  return {
    id,
    companyId,
    companyName:
      (typeof data?.companyName === 'string' && data.companyName.trim()) ||
      (typeof data?.businessName === 'string' && data.businessName.trim()) ||
      fallback?.companyName ||
      `Salon #${companyId || '?'}`,
    serviceId,
    serviceName: typeof data?.serviceName === 'string' && data.serviceName.trim() ? data.serviceName : null,
    staffId,
    staffName: typeof data?.staffName === 'string' && data.staffName.trim() ? data.staffName : null,
    price: typeof data?.price === 'number' ? data.price : null,
    startAt,
    endAt,
    status: typeof data?.status === 'string' ? data.status : 'BOOKED',
  };
}

export const api = {
  registerCustomer: (payload: { fullName: string; email: string; password: string; phone?: string }) => {
    const parts = payload.fullName.trim().split(/\s+/).filter(Boolean);
    const firstName = parts[0] || payload.fullName.trim();
    // Backend requires a non-blank lastName; if the user typed a single-word
    // name, reuse the first name so registration still succeeds.
    const lastName = parts.slice(1).join(' ') || firstName;
    return request<unknown>('/api/public/auth/register/customer', 'POST', {
      firstName,
      lastName,
      email: payload.email,
      password: payload.password,
      ...(payload.phone ? { phone: payload.phone } : {}),
    }).then((response) =>
      normalizeCustomerAuthResponse(response, { fullName: payload.fullName, email: payload.email })
    );
  },
  loginCustomer: (payload: { email: string; password: string }) =>
    requestWithFallback<unknown>(
      ['/api/public/auth/login'],
      'POST',
      {
        emailOrPhone: payload.email,
        password: payload.password,
      }
    ).then((response) =>
      normalizeCustomerAuthResponse(response, { email: payload.email })
    ),
  searchSalons: (
    query: string,
    bounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number },
    filters?: { maxPrice?: number | null; amenities?: string[] }
  ) => {
    const params = new URLSearchParams({ query });
    if (bounds) {
      params.set('minLat', String(bounds.minLat));
      params.set('maxLat', String(bounds.maxLat));
      params.set('minLng', String(bounds.minLng));
      params.set('maxLng', String(bounds.maxLng));
    }
    if (filters?.maxPrice != null) params.set('maxPrice', String(filters.maxPrice));
    if (filters?.amenities && filters.amenities.length > 0) {
      params.set('amenities', filters.amenities.join(','));
    }
    return requestFirstNonEmptyArray([
      `/api/public/salons?${params.toString()}`,
      `/api/public/studios?${params.toString()}`,
      '/api/public/studios?limit=24',
    ]).then((payload) =>
      normalizeSalons(payload as PublicSalon[]).length
        ? normalizeSalons(payload as PublicSalon[])
        : normalizeStudioSalons(payload)
    );
  },
  discoverSalons: (limit = 24) =>
    requestWithFallback<unknown>(
      [`/api/public/salons/discover?limit=${limit}`, `/api/public/studios?limit=${limit}`],
      'GET'
    )
      .then((payload) => normalizeSalons(payload as PublicSalon[]).length ? normalizeSalons(payload as PublicSalon[]) : normalizeStudioSalons(payload))
      .catch(() => api.searchSalons('')),
  salonServices: async (companyId: number): Promise<SalonServicesResponse> => {
    const payload = await requestWithFallback<unknown>(
      [
        `/api/public/salons/${companyId}/services`,
        `/api/public/studios/${companyId}/services`,
        `/api/public/studios/${companyId}`,
      ],
      'GET'
    ).catch(() => [] as unknown);
    const normalized = normalizeSalonServices(payload);
    // The /services endpoints return a bare services array with no team, so the
    // staff picker comes back empty. Pull the salon's staff from the studio detail.
    let staff = normalized.staff;
    if (staff.length === 0) {
      try {
        const studio = (await request<any>(`/api/public/studios/${companyId}`, 'GET')) as any;
        if (Array.isArray(studio?.staff)) staff = studio.staff as PublicStaff[];
      } catch {
        // leave staff empty — the "No preference" option still lets the user book
      }
    }
    return { services: normalized.services, staff };
  },
  salonProfile: (companyId: number) =>
    requestWithFallback<unknown>(
      [`/api/public/salons/${companyId}/profile`, `/api/public/studios/${companyId}`],
      'GET'
    ).then((payload) => normalizeSalonProfile(payload, companyId)),
  salonAvailability: (companyId: number, date: string, staffId?: number, serviceId?: number) => {
    const paths = serviceId
      ? [`/api/public/studios/${companyId}/services/${serviceId}/availability?date=${encodeURIComponent(date)}${staffId ? `&staffId=${staffId}` : ''}`]
      : [
          `/api/public/studios/${companyId}/availability?date=${encodeURIComponent(date)}${staffId ? `&staffId=${staffId}` : ''}`,
          `/api/public/salons/${companyId}/availability?date=${encodeURIComponent(date)}${staffId ? `&staffId=${staffId}` : ''}`,
        ];
    return requestWithFallback<AvailabilityResponse>(paths, 'GET')
      .catch(() => ({ occupiedSlotsUtc: [] as string[] }));
  },
  // Phase 2: real bookable start times for a service on a date (optionally one staff).
  salonSlots: (companyId: number, serviceId: number, date: string, staffId?: number) => {
    const path = `/api/public/studios/${companyId}/services/${serviceId}/slots?date=${encodeURIComponent(date)}${staffId ? `&staffId=${staffId}` : ''}`;
    return requestWithFallback<DailySlotsResponse>([path], 'GET')
      .then((r) => (Array.isArray(r?.availableSlots) ? r.availableSlots : []))
      .catch(() => [] as string[]);
  },
  businessHours: (companyId: number) =>
    requestWithFallback<BusinessHoursItem[]>(
      [
        `/api/business-hours/business/${companyId}`,
        `/api/public/studios/${companyId}/business-hours`,
      ],
      'GET'
    ).then((payload) => (Array.isArray(payload) ? payload : [])),
  createBooking: (
    token: string,
    payload: {
      companyId: number;
      serviceId: number;
      staffId?: number;
      startAt: string;
      endAt: string;
      status?: string;
    }
  ) =>
    requestWithFallback<unknown>(
      ['/api/appointments', '/api/bookings', '/api/customer/bookings', '/api/public/bookings'],
      'POST',
      {
        businessId: payload.companyId,
        serviceId: payload.serviceId,
        ...(payload.staffId != null && payload.staffId !== 0 ? { staffId: payload.staffId } : {}),
        appointmentDate: payload.startAt.slice(0, 10),
        startTime: toTimePart(payload.startAt),
        endTime: toTimePart(payload.endAt),
        status: payload.status ?? 'BOOKED',
      },
      token
    ).then((response) =>
      normalizeCustomerBooking(response, {
        companyId: payload.companyId,
      })
    ),
  listBookings: (token: string) =>
    requestWithFallback<unknown>(
      ['/api/customer/bookings', '/api/public/bookings'],
      'GET',
      undefined,
      token
    ).then((payload) =>
      Array.isArray(payload)
        ? payload.map((item) => normalizeCustomerBooking(item)).filter((item) => Boolean(item?.id))
        : []
    ),
  cancelBooking: (token: string, bookingId: number) =>
    requestWithFallback<unknown>(
      [
        `/api/appointments/${bookingId}/cancel`,
        `/api/customer/bookings/${bookingId}/cancel`,
      ],
      'POST',
      undefined,
      token
    ).catch(() =>
      request<unknown>(`/api/appointments/${bookingId}`, 'DELETE', undefined, token)
    ),
};
