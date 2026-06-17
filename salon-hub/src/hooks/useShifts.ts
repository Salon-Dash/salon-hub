import { useState, useEffect, useCallback } from 'react';
import { shiftService, type Shift, type CreateShiftRequest, type UpdateShiftRequest } from '@/services/shiftService';
import { useBusinessId } from '@/hooks/useBusinessId';
import { toast } from 'sonner';

export function useShifts(businessIdParam?: number, date?: string) {
  const routeBusinessId = useBusinessId();
  const businessId = businessIdParam ?? routeBusinessId;
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadShifts = useCallback(async () => {
    if (!businessId || businessId <= 0 || !date) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await shiftService.getShiftsByBusinessAndDate(businessId, date);
      setShifts(data);
    } catch (err: any) {
      console.error('Failed to load shifts:', err);
      setError(err.message || 'Failed to load shifts');
      toast.error('Failed to load shifts');
    } finally {
      setLoading(false);
    }
  }, [businessId, date]);

  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  const createShift = useCallback(async (request: CreateShiftRequest) => {
    if (!businessId || businessId <= 0) {
      const error = new Error('Business ID is required');
      toast.error(error.message);
      throw error;
    }
    try {
      const created = await shiftService.createShift(businessId, request);
      setShifts(prev => [...prev, created]);
      toast.success('Shift created successfully');
      return created;
    } catch (err: any) {
      toast.error(err.message || 'Failed to create shift');
      throw err;
    }
  }, [businessId]);

  const updateShift = useCallback(async (id: number, request: UpdateShiftRequest) => {
    if (!businessId || businessId <= 0) {
      const error = new Error('Business ID is required');
      toast.error(error.message);
      throw error;
    }
    try {
      const updated = await shiftService.updateShift(id, businessId, request);
      setShifts(prev => prev.map(s => s.id === id ? updated : s));
      toast.success('Shift updated successfully');
      return updated;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update shift');
      throw err;
    }
  }, [businessId]);

  const deleteShift = useCallback(async (id: number) => {
    if (!businessId || businessId <= 0) {
      const error = new Error('Business ID is required');
      toast.error(error.message);
      throw error;
    }
    try {
      await shiftService.deleteShift(id, businessId);
      setShifts(prev => prev.filter(s => s.id !== id));
      toast.success('Shift deleted successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete shift');
      throw err;
    }
  }, [businessId]);

  return {
    shifts,
    loading,
    error,
    createShift,
    updateShift,
    deleteShift,
    refresh: loadShifts,
  };
}


