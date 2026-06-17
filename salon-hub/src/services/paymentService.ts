import { apiClient } from '@/config/api';

export enum PaymentMethod {
  CASH = 'CASH',
  CHECK = 'CHECK',
  BANK_TRANSFER = 'BANK_TRANSFER',
  PAYPAL = 'PAYPAL',
  VENMO = 'VENMO',
  OTHER = 'OTHER'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export interface Payment {
  id: number;
  businessId: number;
  staffId: number;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  paymentDate: string;
  periodStart?: string;
  periodEnd?: string;
  referenceNumber?: string;
  notes?: string;
}

export interface CreatePaymentRequest {
  businessId: number;
  staffId: number;
  amount: number;
  method: PaymentMethod;
  paymentDate: string;
  periodStart?: string;
  periodEnd?: string;
  commissionIds?: number[];
  referenceNumber?: string;
  notes?: string;
}

export const paymentService = {
  async createPayment(request: CreatePaymentRequest): Promise<Payment> {
    return apiClient.post<Payment>('/payments', request);
  },

  async getPaymentsByStaff(businessId: number, staffId: number): Promise<Payment[]> {
    return apiClient.get<Payment[]>(`/payments/business/${businessId}/staff/${staffId}`);
  },

  async getPaymentsByDateRange(
    businessId: number,
    staffId: number,
    startDate: string,
    endDate: string
  ): Promise<Payment[]> {
    return apiClient.get<Payment[]>(
      `/payments/business/${businessId}/staff/${staffId}/date-range?startDate=${startDate}&endDate=${endDate}`
    );
  },

  async getPaymentsByBusiness(businessId: number): Promise<Payment[]> {
    return apiClient.get<Payment[]>(`/payments/business/${businessId}`);
  },

  async updatePaymentStatus(id: number, status: PaymentStatus): Promise<Payment> {
    return apiClient.put<Payment>(`/payments/${id}/status?status=${status}`, {});
  },

  async cancelPayment(id: number): Promise<void> {
    return apiClient.put(`/payments/${id}/cancel`, {});
  },
};


