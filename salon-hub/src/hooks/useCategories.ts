import { useState, useEffect, useCallback } from 'react';
import { categoryService, type Category, type CreateCategoryRequest, type UpdateCategoryRequest } from '@/services/categoryService';
import { useBusinessId } from '@/hooks/useBusinessId';
import { toast } from 'sonner';

export function useCategories(businessIdParam?: number) {
  const routeBusinessId = useBusinessId();
  const businessId = businessIdParam ?? routeBusinessId;
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await categoryService.getCategoriesByBusiness(businessId);
      setCategories(data);
    } catch (err: any) {
      console.error('Failed to load categories:', err);
      setError(err.message || 'Failed to load categories');
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const createCategory = useCallback(async (request: CreateCategoryRequest) => {
    try {
      const created = await categoryService.createCategory(businessId, request);
      setCategories(prev => [...prev, created]);
      toast.success('Category created successfully');
      return created;
    } catch (err: any) {
      toast.error(err.message || 'Failed to create category');
      throw err;
    }
  }, [businessId]);

  const updateCategory = useCallback(async (id: number, request: UpdateCategoryRequest) => {
    try {
      const updated = await categoryService.updateCategory(id, businessId, request);
      setCategories(prev => prev.map(cat => cat.id === id ? updated : cat));
      toast.success('Category updated successfully');
      return updated;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update category');
      throw err;
    }
  }, [businessId]);

  const deleteCategory = useCallback(async (id: number) => {
    try {
      await categoryService.deleteCategory(id, businessId);
      setCategories(prev => prev.filter(cat => cat.id !== id));
      toast.success('Category deleted successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete category');
      throw err;
    }
  }, [businessId]);

  return {
    categories,
    loading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    refresh: loadCategories,
  };
}



