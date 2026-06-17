import { apiClient } from "@/config/api";

export interface QuickSaleItem {
  id: number;
  businessId: number;
  serviceId: number;
  serviceName: string;
  serviceType: 'SERVICE' | 'COMBO';
  durationMinutes?: number;
  price?: number;
  priceType?: 'FIXED' | 'FROM' | 'RANGE';
  color?: string;
  displayOrder: number;
}

export const quickSaleService = {
  async getQuickSaleItems(businessId: number): Promise<QuickSaleItem[]> {
    return apiClient.get<QuickSaleItem[]>(`/quick-sale/business/${businessId}`);
  },

  async updateQuickSaleItems(businessId: number, serviceIds: number[]): Promise<QuickSaleItem[]> {
    return apiClient.put<QuickSaleItem[]>(`/quick-sale/business/${businessId}`, serviceIds);
  },
};

