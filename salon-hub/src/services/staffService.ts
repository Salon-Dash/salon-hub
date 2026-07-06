import { apiClient } from '@/config/api';

export interface Staff {
  id: number;
  businessId: number;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  avatarUrl?: string;
  initials?: string;
  workingHours?: string;
  workingHoursDetail?: Record<string, { start: string | null; end: string | null; isClosed: boolean }>;
  // Per-day working hours from the backend (keys "MONDAY"…, values "HH:mm[:ss]").
  workingHoursStart?: Record<string, string>;
  workingHoursEnd?: Record<string, string>;
  canBookAppointments?: boolean;
  canManageCalendar?: boolean;
  canViewReports?: boolean;
  canManageStaff?: boolean;
  serviceIds?: number[];
  isActive: boolean;
}

export interface CreateStaffRequest {
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  serviceIds?: number[];
  inviteAndCreateAccount?: boolean;
  // staff-service schedule: { MONDAY: ["09:00","17:00"], … } — enabled days only.
  schedule?: Record<string, string[]>;
}

export interface UpdateStaffRequest {
  name?: string;
  email?: string;
  phone?: string;
  position?: string;
  serviceIds?: number[];
  isActive?: boolean;
  // staff-service schedule: { MONDAY: ["09:00","17:00"], … }. Update replaces all days.
  schedule?: Record<string, string[]>;
}

export const staffService = {
  async getStaffByBusiness(businessId: number): Promise<Staff[]> {
    return apiClient.get<Staff[]>(`/staff/business/${businessId}`);
  },

  async getStaffById(id: number, businessId: number): Promise<Staff> {
    return apiClient.get<Staff>(`/staff/${id}/business/${businessId}`);
  },

  async createStaff(businessId: number, request: CreateStaffRequest): Promise<Staff> {
    return apiClient.post<Staff>(`/staff/business/${businessId}`, request);
  },

  async updateStaff(id: number, businessId: number, request: UpdateStaffRequest): Promise<Staff> {
    return apiClient.put<Staff>(`/staff/${id}/business/${businessId}`, request);
  },

  async deleteStaff(id: number, businessId: number): Promise<void> {
    return apiClient.delete<void>(`/staff/${id}/business/${businessId}`);
  },
};










