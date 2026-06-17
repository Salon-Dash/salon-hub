import { apiClient } from '@/config/api';

export interface PaymentConfirmationRequest {
  businessId: number;
  staffId?: number;
  clientId?: number;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  items: Array<{
    serviceId?: number;
    serviceName: string;
    serviceType: string;
    quantity: number;
    unitPrice: number;
    duration?: string;
    notes?: string;
  }>;
  discountAmount?: number;
  discountPercent?: number;
  tipAmount?: number;
  tipPercent?: number;
  paymentMethod: string;
  paymentAmount: number;
  splitCashAmount?: number;
  splitCardAmount?: number;
  notes?: string;
  appointmentId?: number;
}

export interface PaymentConfirmationResponse {
  saleId: number;
  businessId: number;
  totalAmount: number;
  commissions: Array<{
    commissionId: number;
    staffId: number;
    serviceId: number;
    saleAmount: number;
    commissionAmount: number;
  }>;
  appointmentUpdated: boolean;
  message: string;
}

export const paymentConfirmationService = {
  async confirmPayment(request: PaymentConfirmationRequest): Promise<PaymentConfirmationResponse> {
    return apiClient.post<PaymentConfirmationResponse>('/payment-confirmation', request);
  },
};

