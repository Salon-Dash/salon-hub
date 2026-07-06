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
};


