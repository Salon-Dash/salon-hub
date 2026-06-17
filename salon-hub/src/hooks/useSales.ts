import { useState, useEffect, useCallback } from 'react';
import { saleService, type Sale, type CreateSaleRequest } from '@/services/saleService';
import { websocketService } from '@/services/websocketService';
import { useBusinessId } from '@/hooks/useBusinessId';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function useSales(businessIdParam?: number, date?: Date) {
  const routeBusinessId = useBusinessId();
  const businessId = businessIdParam ?? routeBusinessId;
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSales = useCallback(async (targetDate?: Date) => {
    try {
      setLoading(true);
      setError(null);
      const salesData = await saleService.getSalesByBusiness(businessId, targetDate);
      setSales(salesData);
    } catch (err: any) {
      console.error('Failed to load sales:', err);
      setError(err.message || 'Failed to load sales');
      toast.error('Failed to load sales');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    loadSales(date);
  }, [date, loadSales]);

  // WebSocket subscription for real-time updates
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const setupWebSocket = async () => {
      try {
        await websocketService.connect();
        
        unsubscribe = websocketService.subscribeToSales(businessId, (sale: Sale) => {
          setSales(prev => {
            const existing = prev.findIndex(s => s.id === sale.id);
            if (existing >= 0) {
              const updated = [...prev];
              updated[existing] = sale;
              return updated;
            } else {
              return [...prev, sale];
            }
          });
        });
      } catch (err) {
        console.warn('WebSocket connection failed:', err);
      }
    };

    setupWebSocket();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [businessId]);

  const createSale = useCallback(async (request: CreateSaleRequest) => {
    try {
      const created = await saleService.createSale(request);
      setSales(prev => [...prev, created]);
      toast.success('Sale created successfully');
      return created;
    } catch (err: any) {
      toast.error(err.message || 'Failed to create sale');
      throw err;
    }
  }, []);

  const cancelSale = useCallback(async (id: number) => {
    try {
      await saleService.cancelSale(id);
      setSales(prev => prev.filter(s => s.id !== id));
      toast.success('Sale cancelled successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel sale');
      throw err;
    }
  }, []);

  return {
    sales,
    loading,
    error,
    createSale,
    cancelSale,
    refresh: () => loadSales(date),
  };
}



