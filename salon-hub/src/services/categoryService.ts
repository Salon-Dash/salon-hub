import { apiClient } from '@/config/api';

export interface Category {
  id: number;
  businessId: number;
  name: string;
  description?: string;
  color?: string;
  displayOrder?: number;
  isVisible: boolean;
  serviceCount?: number;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  color?: string;
  isVisible?: boolean;
}

export const categoryService = {
  async getCategoriesByBusiness(businessId: number): Promise<Category[]> {
    return apiClient.get<Category[]>(`/categories/business/${businessId}`);
  },

  async createCategory(businessId: number, request: CreateCategoryRequest): Promise<Category> {
    return apiClient.post<Category>(`/categories/business/${businessId}`, request);
  },

  async updateCategory(id: number, businessId: number, request: UpdateCategoryRequest): Promise<Category> {
    return apiClient.put<Category>(`/categories/${id}/business/${businessId}`, request);
  },

  async deleteCategory(id: number, businessId: number): Promise<void> {
    return apiClient.delete<void>(`/categories/${id}/business/${businessId}`);
  },
};

























