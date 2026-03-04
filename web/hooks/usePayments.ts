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
      credentials: 'include',
    });
    await reload();
  };

  const updatePayment = async (id: string, payload: Partial<Payment>) => {
    await fetch(`${API_BASE_URL}/api/payments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    await reload();
  };

  const deletePayment = async (id: string) => {
    await fetch(`${API_BASE_URL}/api/payments/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    await reload();
  };

  const bulkCreateMonthPayments = async (monthRef: string) => {
    const response = await fetch(`${API_BASE_URL}/api/payments/bulk-month`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month_ref: monthRef }),
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const result = (await response.json()) as {
      month_ref: string;
      activeStudents: number;
      createdCount: number;
      skippedCount: number;
    };
    await reload();
    return result;
  };

  return {
    payments: data,
    loading,
    error,
    reload,
    createPayment,
    updatePayment,
    deletePayment,
    bulkCreateMonthPayments,
  };
}
