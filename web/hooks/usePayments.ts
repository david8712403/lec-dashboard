'use client';

import { Payment } from '@/types';
import { API_BASE_URL } from './useDashboardData';
import { useResource } from './useResource';

const normalizeDate = (value?: string | null) => {
  if (!value) return value ?? undefined;
  return String(value).includes('T') ? String(value).split('T')[0] : String(value);
};

const normalizePayment = (payment: Payment): Payment => ({
  ...payment,
  paid_at: normalizeDate(payment.paid_at) ?? payment.paid_at,
});

export function usePayments() {
  const { data, setData, loading, error, reload } = useResource<Payment[]>('/api/payments', []);

  const createPayment = async (payload: Partial<Payment>) => {
    const response = await fetch(`${API_BASE_URL}/api/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const created = (await response.json()) as Payment;
    setData((prev) => [...prev, normalizePayment(created)]);
  };

  const updatePayment = async (id: string, payload: Partial<Payment>) => {
    const response = await fetch(`${API_BASE_URL}/api/payments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const updated = (await response.json()) as Payment;
    const normalized = normalizePayment(updated);
    setData((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...normalized } : item)),
    );
  };

  const deletePayment = async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/api/payments/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    setData((prev) => prev.filter((item) => item.id !== id));
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
