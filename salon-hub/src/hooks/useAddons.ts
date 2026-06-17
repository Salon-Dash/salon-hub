import { useState, useEffect, useCallback } from 'react';
import { addonService, type Addon, type CreateAddonRequest, type UpdateAddonRequest } from '@/services/addonService';
import { useBusinessId } from '@/hooks/useBusinessId';
import { toast } from 'sonner';

export function useAddons(businessIdParam?: number) {
  const routeBusinessId = useBusinessId();
  const businessId = businessIdParam ?? routeBusinessId;
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAddons = useCallback(async () => {
    if (!businessId || businessId <= 0) {
      setError('Business ID is required');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await addonService.getAddonsByBusiness(businessId);
      setAddons(data);
    } catch (err: any) {
      console.error('Failed to load addons:', err);
      setError(err.message || 'Failed to load addons');
      toast.error('Failed to load addons');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    loadAddons();
  }, [loadAddons]);

  const createAddon = useCallback(async (request: CreateAddonRequest) => {
    if (!businessId || businessId <= 0) {
      const error = new Error('Business ID is required');
      toast.error(error.message);
      throw error;
    }
    try {
      const created = await addonService.createAddon(businessId, request);
      setAddons(prev => [...prev, created]);
      toast.success('Addon created successfully');
      return created;
    } catch (err: any) {
      toast.error(err.message || 'Failed to create addon');
      throw err;
    }
  }, [businessId]);

  const updateAddon = useCallback(async (id: number, request: UpdateAddonRequest) => {
    try {
      const updated = await addonService.updateAddon(id, businessId, request);
      setAddons(prev => prev.map(addon => addon.id === id ? updated : addon));
      toast.success('Addon updated successfully');
      return updated;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update addon');
      throw err;
    }
  }, [businessId]);

  const deleteAddon = useCallback(async (id: number) => {
    try {
      await addonService.deleteAddon(id, businessId);
      setAddons(prev => prev.filter(addon => addon.id !== id));
      toast.success('Addon deleted successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete addon');
      throw err;
    }
  }, [businessId]);

  return {
    addons,
    loading,
    error,
    createAddon,
    updateAddon,
    deleteAddon,
    refresh: loadAddons,
  };
}


