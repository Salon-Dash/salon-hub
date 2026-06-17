import { apiClient } from '@/config/api';

export enum CommissionCategory {
  DEFAULT = 'DEFAULT',
  SERVICES = 'SERVICES',
  PRODUCTS = 'PRODUCTS',
  GIFT_CARDS = 'GIFT_CARDS',
  MEMBERSHIPS = 'MEMBERSHIPS',
  PACKAGES = 'PACKAGES'
}

export enum CommissionType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT'
}

export enum CommissionStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED'
}

export interface CommissionRule {
  id?: number;
  businessId: number;
  category: CommissionCategory;
  staffId?: number;
  serviceId?: number;
  categoryId?: number;
  type: CommissionType;
  value: number;
  description?: string;
  isActive?: boolean;
}

export interface Commission {
  id: number;
  businessId: number;
  staffId: number;
  appointmentId?: number;
  serviceId?: number;
  saleId?: number;
  category: CommissionCategory;
  saleAmount: number;
  commissionAmount: number;
  status: CommissionStatus;
  commissionDate: string;
  paymentId?: number;
  notes?: string;
}

export interface CreateCommissionRuleRequest {
  businessId: number;
  category: CommissionCategory;
  staffId?: number;
  serviceId?: number;
  categoryId?: number;
  type: CommissionType;
  value: number;
  description?: string;
  isActive?: boolean;
}

export const commissionService = {
  // Commission Rules
  async getCommissionRules(businessId: number): Promise<CommissionRule[]> {
    return apiClient.get<CommissionRule[]>(`/commission-rules/business/${businessId}`);
  },

  async getCommissionRulesByCategory(businessId: number, category: CommissionCategory): Promise<CommissionRule[]> {
    return apiClient.get<CommissionRule[]>(`/commission-rules/business/${businessId}/category/${category}`);
  },

  async getCommissionRulesByStaff(businessId: number, staffId: number): Promise<CommissionRule[]> {
    return apiClient.get<CommissionRule[]>(`/commission-rules/business/${businessId}/staff/${staffId}`);
  },

  async createCommissionRule(request: CreateCommissionRuleRequest): Promise<CommissionRule> {
    return apiClient.post<CommissionRule>('/commission-rules', request);
  },

  async updateCommissionRule(id: number, request: Partial<CommissionRule>): Promise<CommissionRule> {
    return apiClient.put<CommissionRule>(`/commission-rules/${id}`, request);
  },

  async deleteCommissionRule(id: number): Promise<void> {
    return apiClient.delete(`/commission-rules/${id}`);
  },

  async deactivateCommissionRule(id: number): Promise<void> {
    return apiClient.put(`/commission-rules/${id}/deactivate`, {});
  },

  async deleteAllCommissionRules(businessId: number): Promise<void> {
    return apiClient.delete(`/commission-rules/business/${businessId}/all`);
  },

  // Commissions
  async getCommissionsByStaff(businessId: number, staffId: number): Promise<Commission[]> {
    return apiClient.get<Commission[]>(`/commissions/business/${businessId}/staff/${staffId}`);
  },

  async getPendingCommissions(businessId: number, staffId: number): Promise<Commission[]> {
    return apiClient.get<Commission[]>(`/commissions/business/${businessId}/staff/${staffId}/pending`);
  },

  async getTotalPendingCommission(businessId: number, staffId: number): Promise<number> {
    return apiClient.get<number>(`/commissions/business/${businessId}/staff/${staffId}/total-pending`);
  },

  async getCommissionsByDateRange(
    businessId: number,
    staffId: number,
    startDate: string,
    endDate: string
  ): Promise<Commission[]> {
    return apiClient.get<Commission[]>(
      `/commissions/business/${businessId}/staff/${staffId}/date-range?startDate=${startDate}&endDate=${endDate}`
    );
  },

  async calculateCommission(
    businessId: number,
    staffId: number,
    appointmentId: number,
    serviceId: number,
    saleAmount: number
  ): Promise<Commission> {
    return apiClient.post<Commission>(
      `/commissions/calculate?businessId=${businessId}&staffId=${staffId}&appointmentId=${appointmentId}&serviceId=${serviceId}&saleAmount=${saleAmount}`,
      {}
    );
  },

  async cancelCommission(id: number): Promise<void> {
    return apiClient.put(`/commissions/${id}/cancel`, {});
  },

  async cancelCommissionsForAppointment(appointmentId: number): Promise<void> {
    return apiClient.put(`/commissions/appointment/${appointmentId}/cancel`, {});
  },
};

