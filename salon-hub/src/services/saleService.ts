import { apiClient } from '@/config/api';
import { format } from 'date-fns';

export interface SaleItem {
  id?: number;
  serviceId?: number;
  serviceName: string;
  serviceType: string;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
  duration?: string;
  notes?: string;
}

export interface Sale {
  id: number;
  businessId: number;
  staffId?: number;
  staffName?: string;
  clientId?: number;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  saleDate: string;
  saleTime: string;
  items: SaleItem[];
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  tipAmount: number;
  tipPercent: number;
  total: number;
  paymentMethod: 'CASH' | 'CARD_TERMINAL' | 'CHECK' | 'SPLIT' | 'MEMBERSHIP' | 'GIFT_CARD' | 'PACKAGE';
  paymentAmount: number;
  changeAmount: number;
  splitCashAmount?: number;
  splitCardAmount?: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
  notes?: string;
  billNumber?: string;
  billId?: string;
}

export interface CreateSaleRequest {
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
  paymentMethod: 'CASH' | 'CARD_TERMINAL' | 'CHECK' | 'SPLIT' | 'MEMBERSHIP' | 'GIFT_CARD' | 'PACKAGE';
  paymentAmount: number;
  notes?: string;
}

export const saleService = {
  async getSalesByBusiness(businessId: number, date?: Date): Promise<Sale[]> {
    if (date) {
      const dateStr = format(date, 'yyyy-MM-dd');
      return apiClient.get<Sale[]>(`/sales/business/${businessId}?date=${dateStr}`);
    }
    return apiClient.get<Sale[]>(`/sales/business/${businessId}`);
  },

  async getSalesByDateRange(businessId: number, startDate: Date, endDate: Date): Promise<Sale[]> {
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');
    return apiClient.get<Sale[]>(`/sales/business/${businessId}?startDate=${startDateStr}&endDate=${endDateStr}`);
  },

  async getSaleById(id: number): Promise<Sale> {
    return apiClient.get<Sale>(`/sales/${id}`);
  },

  async createSale(request: CreateSaleRequest): Promise<Sale> {
    return apiClient.post<Sale>('/sales', request);
  },

  async cancelSale(id: number): Promise<void> {
    return apiClient.delete<void>(`/sales/${id}`);
  },
};











