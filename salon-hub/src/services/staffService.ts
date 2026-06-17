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
}

export interface UpdateStaffRequest {
  name?: string;
  email?: string;
  phone?: string;
  position?: string;
  serviceIds?: number[];
  isActive?: boolean;
  workingHours?: Record<string, { start: string; end: string; isClosed: boolean }>;
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










