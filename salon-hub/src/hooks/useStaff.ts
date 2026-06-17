import { useState, useEffect, useCallback } from 'react';
import { staffService, type Staff, type CreateStaffRequest, type UpdateStaffRequest } from '@/services/staffService';
import { useBusinessId } from '@/hooks/useBusinessId';
import { toast } from 'sonner';

export function useStaff(businessIdParam?: number) {
  const routeBusinessId = useBusinessId();
  const businessId = businessIdParam ?? routeBusinessId;
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStaff = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await staffService.getStaffByBusiness(businessId);
      setStaff(data);
    } catch (err: any) {
      console.error('Failed to load staff:', err);
      setError(err.message || 'Failed to load staff');
      toast.error('Failed to load staff');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const createStaff = useCallback(async (request: CreateStaffRequest) => {
    try {
      const created = await staffService.createStaff(businessId, request);
      setStaff(prev => [...prev, created]);
      toast.success('Staff member created successfully');
      return created;
    } catch (err: any) {
      toast.error(err.message || 'Failed to create staff member');
      throw err;
    }
  }, [businessId]);

  const updateStaff = useCallback(async (id: number, request: UpdateStaffRequest) => {
    try {
      const updated = await staffService.updateStaff(id, businessId, request);
      setStaff(prev => prev.map(s => s.id === id ? updated : s));
      toast.success('Staff member updated successfully');
      return updated;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update staff member');
      throw err;
    }
  }, [businessId]);

  const deleteStaff = useCallback(async (id: number) => {
    try {
      await staffService.deleteStaff(id, businessId);
      setStaff(prev => prev.filter(s => s.id !== id));
      toast.success('Staff member deleted successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete staff member');
      throw err;
    }
  }, [businessId]);

  return {
    staff,
    loading,
    error,
    createStaff,
    updateStaff,
    deleteStaff,
    refresh: loadStaff,
  };
}



