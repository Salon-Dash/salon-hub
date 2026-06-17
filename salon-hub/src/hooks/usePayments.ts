import { useState, useEffect, useCallback } from 'react';
import { paymentService, Payment, CreatePaymentRequest, PaymentStatus } from '@/services/paymentService';
import { useBusinessId } from './useBusinessId';

interface UsePaymentsOptions {
  staffId?: number;
  businessId?: number;
}

export const usePayments = (options?: UsePaymentsOptions) => {
  const defaultBusinessId = useBusinessId();
  const businessId = options?.businessId || defaultBusinessId;
  const staffId = options?.staffId;

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadPayments = useCallback(async () => {
    if (!businessId || !staffId) return;

    setLoading(true);
    setError(null);
    try {
      const result = await paymentService.getPaymentsByStaff(businessId, staffId);
      setPayments(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load payments'));
      console.error('Error loading payments:', err);
    } finally {
      setLoading(false);
    }
  }, [businessId, staffId]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const refresh = useCallback(() => {
    loadPayments();
  }, [loadPayments]);

  const createPayment = useCallback(async (request: CreatePaymentRequest) => {
    setLoading(true);
    setError(null);
    try {
      const payment = await paymentService.createPayment(request);
      await refresh();
      return payment;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create payment'));
      console.error('Error creating payment:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const getPaymentsByDateRange = useCallback(async (startDate: string, endDate: string) => {
    if (!businessId || !staffId) return [];

    setLoading(true);
    setError(null);
    try {
      const result = await paymentService.getPaymentsByDateRange(businessId, staffId, startDate, endDate);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load payments by date range'));
      console.error('Error loading payments by date range:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [businessId, staffId]);

  const updatePaymentStatus = useCallback(async (id: number, status: PaymentStatus) => {
    setLoading(true);
    setError(null);
    try {
      const payment = await paymentService.updatePaymentStatus(id, status);
      await refresh();
      return payment;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update payment status'));
      console.error('Error updating payment status:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const cancelPayment = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      await paymentService.cancelPayment(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to cancel payment'));
      console.error('Error cancelling payment:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  return {
    payments,
    loading,
    error,
    refresh,
    createPayment,
    getPaymentsByDateRange,
    updatePaymentStatus,
    cancelPayment,
  };
};


