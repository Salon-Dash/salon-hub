import { useState, useEffect, useCallback } from "react";
import { businessHoursService, type BusinessHours, type BusinessHoursUpdateItem } from "@/services/businessHoursService";
import { useBusinessId } from "@/hooks/useBusinessId";

export function useBusinessHours(businessIdParam?: number) {
  const routeBusinessId = useBusinessId();
  const currentBusinessId = businessIdParam ?? routeBusinessId;
  const [businessHours, setBusinessHours] = useState<BusinessHours[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBusinessHours = useCallback(async () => {
    if (!currentBusinessId) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await businessHoursService.getBusinessHoursByBusinessId(currentBusinessId);
      setBusinessHours(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch business hours");
      console.error("Error fetching business hours:", err);
    } finally {
      setLoading(false);
    }
  }, [currentBusinessId]);

  useEffect(() => {
    fetchBusinessHours();
  }, [fetchBusinessHours]);

  // Helper function to get business hours for a specific day
  const getHoursForDay = useCallback((dayOfWeek: string): BusinessHours | null => {
    return businessHours.find(h => h.dayOfWeek === dayOfWeek.toUpperCase()) || null;
  }, [businessHours]);

  // Helper function to get default hours (from Monday or first enabled day)
  const getDefaultHours = useCallback((): { startTime: string; endTime: string } | null => {
    const monday = getHoursForDay("MONDAY");
    if (monday && monday.enabled && monday.startTime && monday.endTime) {
      return { startTime: monday.startTime, endTime: monday.endTime };
    }
    
    // Find first enabled day
    const enabledDay = businessHours.find(h => h.enabled && h.startTime && h.endTime);
    if (enabledDay) {
      return { startTime: enabledDay.startTime!, endTime: enabledDay.endTime! };
    }
    
    return null;
  }, [businessHours, getHoursForDay]);

  // Helper function to check if a time is within business hours for a specific day
  const isWithinBusinessHours = useCallback((hour: number, dayOfWeek?: string): boolean => {
    if (!dayOfWeek) {
      // Use default hours if no day specified
      const defaultHours = getDefaultHours();
      if (!defaultHours) return false;
      const [startHour] = defaultHours.startTime.split(":").map(Number);
      const [endHour] = defaultHours.endTime.split(":").map(Number);
      return hour >= startHour && hour < endHour;
    }
    
    const dayHours = getHoursForDay(dayOfWeek);
    if (!dayHours || !dayHours.enabled || !dayHours.startTime || !dayHours.endTime) {
      return false;
    }
    
    const [startHour] = dayHours.startTime.split(":").map(Number);
    const [endHour] = dayHours.endTime.split(":").map(Number);
    return hour >= startHour && hour < endHour;
  }, [getHoursForDay, getDefaultHours]);

  const updateBusinessHours = useCallback(async (hours: BusinessHoursUpdateItem[]): Promise<BusinessHours[]> => {
    if (!currentBusinessId) throw new Error("Business ID is required");
    const updated = await businessHoursService.updateBusinessHours(currentBusinessId, hours);
    setBusinessHours(updated);
    return updated;
  }, [currentBusinessId]);

  return {
    businessHours,
    loading,
    error,
    fetchBusinessHours,
    updateBusinessHours,
    getHoursForDay,
    getDefaultHours,
    isWithinBusinessHours,
  };
}








