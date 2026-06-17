import { apiClient } from "@/config/api";

export interface BusinessHours {
  id: number;
  businessId: number;
  dayOfWeek: string;
  enabled: boolean;
  startTime: string | null;
  endTime: string | null;
}

export interface BusinessHoursUpdateItem {
  dayOfWeek: string;  // MONDAY, TUESDAY, etc.
  enabled: boolean;
  startTime: string;  // "09:00"
  endTime: string;    // "17:00"
}

export const businessHoursService = {
  async getBusinessHoursByBusinessId(businessId: number): Promise<BusinessHours[]> {
    return apiClient.get<BusinessHours[]>(`/business-hours/business/${businessId}`);
  },

  async updateBusinessHours(businessId: number, hours: BusinessHoursUpdateItem[]): Promise<BusinessHours[]> {
    return apiClient.put<BusinessHours[]>(`/business-hours/business/${businessId}`, hours);
  },
};























