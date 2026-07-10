import { apiClient } from '@/config/api';

export interface Service {
  id: number;
  businessId: number;
  categoryId?: number;
  categoryName?: string;
  name: string;
  description?: string;
  durationMinutes?: number;
  price?: number;
  priceType?: 'FIXED' | 'FROM' | 'RANGE';
  serviceType?: string;
  color?: string;
  isActive: boolean;
  isVisible: boolean;
  staffIds?: number[];
  mobileService?: boolean;
  virtualAppointment?: boolean;
  bookingInterval?: number; // minutes between offered start times; 0 = step by duration
  paddingBefore?: number;   // buffer minutes reserved before the appointment
  paddingAfter?: number;    // buffer minutes reserved after the appointment
  processingDuring?: number; // client-visit minutes after active work where staff is free
  processingAfter?: number;  // additional client-visit minutes where staff is free
}

export interface CreateServiceRequest {
  categoryId?: number;
  name: string;
  description?: string;
  durationMinutes?: number;
  price?: number;
  priceType?: 'FIXED' | 'FROM' | 'RANGE';
  serviceType?: string;
  color?: string;
  comboServiceIds?: number[];
  timeBetweenMinutes?: number[];
  staffIds?: number[];
  isVisible?: boolean;
  mobileService?: boolean;
  virtualAppointment?: boolean;
  bookingInterval?: number;
  paddingBefore?: number;
  paddingAfter?: number;
  processingDuring?: number;
  processingAfter?: number;
}

export interface UpdateServiceRequest {
  categoryId?: number;
  name?: string;
  description?: string;
  durationMinutes?: number;
  price?: number;
  priceType?: 'FIXED' | 'FROM' | 'RANGE';
  serviceType?: string;
  color?: string;
  isActive?: boolean;
  isVisible?: boolean;
  comboServiceIds?: number[];
  timeBetweenMinutes?: number[];
  staffIds?: number[];
  mobileService?: boolean;
  virtualAppointment?: boolean;
  bookingInterval?: number;
  paddingBefore?: number;
  paddingAfter?: number;
  processingDuring?: number;
  processingAfter?: number;
}

export interface ComboServiceItem {
  id: number;
  comboServiceId: number;
  serviceId: number;
  serviceName?: string;
  displayOrder: number;
  timeBetweenMinutes?: number;
}

export const serviceService = {
  async getServicesByBusiness(businessId: number): Promise<Service[]> {
    return apiClient.get<Service[]>(`/services/business/${businessId}`);
  },

  async getServicesByCategory(categoryId: number): Promise<Service[]> {
    return apiClient.get<Service[]>(`/services/category/${categoryId}`);
  },

  async createService(businessId: number, request: CreateServiceRequest): Promise<Service> {
    if (request.price !== undefined && request.price !== null && request.price < 0) {
      throw new Error("Service price cannot be negative");
    }
    if (request.durationMinutes !== undefined && request.durationMinutes <= 0) {
      throw new Error("Service duration must be greater than 0");
    }
    return apiClient.post<Service>(`/services/business/${businessId}`, request);
  },

  async updateService(id: number, businessId: number, request: UpdateServiceRequest): Promise<Service> {
    if (request.price !== undefined && request.price !== null && request.price < 0) {
      throw new Error("Service price cannot be negative");
    }
    if (request.durationMinutes !== undefined && request.durationMinutes <= 0) {
      throw new Error("Service duration must be greater than 0");
    }
    return apiClient.put<Service>(`/services/${id}/business/${businessId}`, request);
  },

  async deleteService(id: number, businessId: number): Promise<void> {
    return apiClient.delete<void>(`/services/${id}/business/${businessId}`);
  },

  async getComboServiceItems(serviceId: number): Promise<ComboServiceItem[]> {
    return apiClient.get<ComboServiceItem[]>(`/services/${serviceId}/combo-items`);
  },

  // Service↔staff assignments viewed from the staff side. Assignments are owned by
  // service-catalog; these let the staff form load and save which services a staff
  // member can perform (the counterpart of the staffIds field on the service form).
  async getStaffServiceIds(businessId: number, staffId: number): Promise<number[]> {
    return apiClient.get<number[]>(`/services/assignments/business/${businessId}/staff/${staffId}`);
  },

  async setStaffServiceIds(businessId: number, staffId: number, serviceIds: number[]): Promise<number[]> {
    return apiClient.put<number[]>(
      `/services/assignments/business/${businessId}/staff/${staffId}`,
      { serviceIds }
    );
  },
};


