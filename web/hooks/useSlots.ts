'use client';

import { ScheduleSlot } from '@/types';
import { API_BASE_URL } from './useDashboardData';
import { useResource } from './useResource';

export function useSlots() {
  const { data, loading, error, reload } = useResource<ScheduleSlot[]>('/api/slots', []);

  const createSlot = async (payload: Partial<ScheduleSlot>) => {
    await fetch(`${API_BASE_URL}/api/slots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    await reload();
  };

  const updateSlot = async (id: string, payload: Partial<ScheduleSlot>) => {
    await fetch(`${API_BASE_URL}/api/slots/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    await reload();
  };

  const deleteSlot = async (id: string) => {
    await fetch(`${API_BASE_URL}/api/slots/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    await reload();
  };

  return {
    slots: data,
    loading,
    error,
    reload,
    createSlot,
    updateSlot,
    deleteSlot,
  };
}
