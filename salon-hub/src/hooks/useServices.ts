import { useState, useEffect, useCallback } from 'react';
import { serviceService, type Service, type CreateServiceRequest, type UpdateServiceRequest } from '@/services/serviceService';
import { useBusinessId } from '@/hooks/useBusinessId';
import { toast } from 'sonner';

export function useServices(businessIdParam?: number, categoryId?: number) {
  const routeBusinessId = useBusinessId();
  const businessId = businessIdParam ?? routeBusinessId;
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadServices = useCallback(async () => {
    if (!businessId || businessId <= 0) {
      setError('Business ID is required');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = categoryId 
        ? await serviceService.getServicesByCategory(categoryId)
        : await serviceService.getServicesByBusiness(businessId);
      setServices(data);
    } catch (err: any) {
      console.error('Failed to load services:', err);
      setError(err.message || 'Failed to load services');
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  }, [businessId, categoryId]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const createService = useCallback(async (request: CreateServiceRequest) => {
    if (!businessId || businessId <= 0) {
      const error = new Error('Business ID is required');
      toast.error(error.message);
      throw error;
    }
    try {
      const created = await serviceService.createService(businessId, request);
      setServices(prev => [...prev, created]);
      toast.success('Service created successfully');
      return created;
    } catch (err: any) {
      toast.error(err.message || 'Failed to create service');
      throw err;
    }
  }, [businessId]);

  const updateService = useCallback(async (id: number, request: UpdateServiceRequest) => {
    try {
      const updated = await serviceService.updateService(id, businessId, request);
      setServices(prev => prev.map(svc => svc.id === id ? updated : svc));
      toast.success('Service updated successfully');
      return updated;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update service');
      throw err;
    }
  }, [businessId]);

  const deleteService = useCallback(async (id: number) => {
    try {
      await serviceService.deleteService(id, businessId);
      setServices(prev => prev.filter(svc => svc.id !== id));
      toast.success('Service deleted successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete service');
      throw err;
    }
  }, [businessId]);

  return {
    services,
    loading,
    error,
    createService,
    updateService,
    deleteService,
    refresh: loadServices,
  };
}



