import { apiClient } from '@/config/api';

export interface Addon {
  id: number;
  businessId: number;
  name: string;
  description?: string;
  price?: number;
  priceType?: 'FIXED' | 'FROM' | 'RANGE';
  color?: string;
  isActive: boolean;
  isVisible: boolean;
}

export interface CreateAddonRequest {
  name: string;
  description?: string;
  price?: number;
  priceType?: 'FIXED' | 'FROM' | 'RANGE';
  color?: string;
}

export interface UpdateAddonRequest {
  name?: string;
  description?: string;
  price?: number;
  priceType?: 'FIXED' | 'FROM' | 'RANGE';
  color?: string;
  isActive?: boolean;
  isVisible?: boolean;
}

export const addonService = {
  async getAddonsByBusiness(businessId: number): Promise<Addon[]> {
    return apiClient.get<Addon[]>(`/addons/business/${businessId}`);
  },

  async createAddon(businessId: number, request: CreateAddonRequest): Promise<Addon> {
    return apiClient.post<Addon>(`/addons/business/${businessId}`, request);
  },

  async updateAddon(id: number, businessId: number, request: UpdateAddonRequest): Promise<Addon> {
    return apiClient.put<Addon>(`/addons/${id}/business/${businessId}`, request);
  },

  async deleteAddon(id: number, businessId: number): Promise<void> {
    return apiClient.delete<void>(`/addons/${id}/business/${businessId}`);
  },
};
























