import { apiClient } from '@/config/api';

export interface Shift {
  id: number;
  businessId: number;
  staffId: number;
  staffName?: string;
  shiftDate: string; // ISO date string (YYYY-MM-DD)
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  notes?: string;
}

export interface CreateShiftRequest {
  staffId: number;
  shiftDate: string; // ISO date string (YYYY-MM-DD)
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  notes?: string;
}

export interface UpdateShiftRequest {
  shiftDate?: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
}

export const shiftService = {
  async getShiftsByBusinessAndDate(businessId: number, date: string): Promise<Shift[]> {
    return apiClient.get<Shift[]>(`/shifts/business/${businessId}/date/${date}`);
  },

  async getShiftsByStaffAndDate(staffId: number, date: string): Promise<Shift[]> {
    return apiClient.get<Shift[]>(`/shifts/staff/${staffId}/date/${date}`);
  },

  async createShift(businessId: number, request: CreateShiftRequest): Promise<Shift> {
    return apiClient.post<Shift>(`/shifts/business/${businessId}`, request);
  },

  async updateShift(id: number, businessId: number, request: UpdateShiftRequest): Promise<Shift> {
    return apiClient.put<Shift>(`/shifts/${id}/business/${businessId}`, request);
  },

  async deleteShift(id: number, businessId: number): Promise<void> {
    return apiClient.delete<void>(`/shifts/${id}/business/${businessId}`);
  },
};


