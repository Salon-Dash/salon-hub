import { apiClient } from '@/config/api';

export interface BusinessRequest {
  ownerId: number;
  name: string;
  description?: string;
  category?: string;
  logoUrl?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  buildingNumber?: string;
  apartmentNumber?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface Business {
  id: number;
  ownerId: number;
  name: string;
  description?: string;
  category?: string;
  logoUrl?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  buildingNumber?: string;
  apartmentNumber?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  status: string;
  subscriptionPlan: string;
  createdAt: string;
  updatedAt?: string;
  verifiedAt?: string;
}

export interface BranchRequest {
  businessId: number;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
}

export interface Branch {
  id: number;
  businessId: number;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  createdAt: string;
  updatedAt?: string;
}

class BusinessService {
  async createBusiness(data: BusinessRequest, _accessToken?: string): Promise<Business> {
    return apiClient.post<Business>('/businesses', data);
  }

  async getBusiness(id: number, _accessToken?: string): Promise<Business> {
    return apiClient.get<Business>(`/businesses/${id}`);
  }

  async getBusinessesByOwner(ownerId: number, _accessToken?: string): Promise<Business[]> {
    return apiClient.get<Business[]>(`/businesses/owner/${ownerId}`);
  }

  async updateBusiness(id: number, data: Partial<BusinessRequest>, _accessToken?: string): Promise<Business> {
    return apiClient.put<Business>(`/businesses/${id}`, data);
  }

  async createBranch(data: BranchRequest, _accessToken?: string): Promise<Branch> {
    return apiClient.post<Branch>(`/businesses/${data.businessId}/branches`, data);
  }
}

export const businessService = new BusinessService();
