import { apiClient } from "@/config/api";

export interface TimeOff {
  id: number;
  businessId: number;
  staffId: number;
  staffName: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  isFullDay: boolean;
  isRecurring: boolean;
  recurrencePattern?: string;
  recurrenceEndDate?: string;
  reason?: string;
  isApproved: boolean;
  needsManagerApproval: boolean;
  approvedBy?: number;
  approvedAt?: string;
}

export interface CreateTimeOffRequest {
  businessId: number;
  staffId: number;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  isFullDay: boolean;
  isRecurring: boolean;
  recurrencePattern?: string;
  recurrenceEndDate?: string;
  reason?: string;
  isApproved: boolean;
}

export interface UpdateTimeOffRequest {
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  isFullDay?: boolean;
  isRecurring?: boolean;
  recurrencePattern?: string;
  recurrenceEndDate?: string;
  reason?: string;
  isApproved?: boolean;
}

export const timeOffService = {
  async getTimeOffsByBusiness(businessId: number): Promise<TimeOff[]> {
    return apiClient.get<TimeOff[]>(`/time-off/business/${businessId}`);
  },

  async getTimeOffsByStaff(staffId: number): Promise<TimeOff[]> {
    return apiClient.get<TimeOff[]>(`/time-off/staff/${staffId}`);
  },

  async getTimeOffsForDate(businessId: number, date: string): Promise<TimeOff[]> {
    return apiClient.get<TimeOff[]>(`/time-off/business/${businessId}/date/${date}`);
  },

  async getTimeOffsForStaffAndDate(businessId: number, staffId: number, date: string): Promise<TimeOff[]> {
    return apiClient.get<TimeOff[]>(`/time-off/business/${businessId}/staff/${staffId}/date/${date}`);
  },

  async createTimeOff(data: CreateTimeOffRequest): Promise<TimeOff> {
    return apiClient.post<TimeOff>("/time-off", data);
  },

  async updateTimeOff(id: number, data: UpdateTimeOffRequest): Promise<TimeOff> {
    return apiClient.put<TimeOff>(`/time-off/${id}`, data);
  },

  async deleteTimeOff(id: number): Promise<void> {
    return apiClient.delete(`/time-off/${id}`);
  },

  async approveTimeOff(id: number, approvedBy: number): Promise<TimeOff> {
    return apiClient.post<TimeOff>(`/time-off/${id}/approve?approvedBy=${approvedBy}`);
  },
};

