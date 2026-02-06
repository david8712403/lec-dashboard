'use client';

import { Payment } from '@/types';
import { API_BASE_URL } from './useDashboardData';
import { useResource } from './useResource';

export function usePayments() {
  const { data, loading, error, reload } = useResource<Payment[]>('/api/payments', []);

  const createPayment = async (payload: Partial<Payment>) => {
    await fetch(`${API_BASE_URL}/api/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await reload();
  };

  const updatePayment = async (id: string, payload: Partial<Payment>) => {
    await fetch(`${API_BASE_URL}/api/payments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await reload();
  };

  const deletePayment = async (id: string) => {
    await fetch(`${API_BASE_URL}/api/payments/${id}`, { method: 'DELETE' });
    await reload();
  };

  return {
    payments: data,
    loading,
    error,
    reload,
    createPayment,
    updatePayment,
    deletePayment,
  };
}
