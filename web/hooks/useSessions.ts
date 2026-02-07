'use client';

import { Session } from '@/types';
import { API_BASE_URL } from './useDashboardData';
import { useResource } from './useResource';

const normalizeSessionDate = (value?: string | null) => {
  if (!value) return value;
  return value.includes('T') ? value.split('T')[0] : value;
};

const normalizeSession = (session: Session): Session => ({
  ...session,
  session_date: normalizeSessionDate(session.session_date) ?? session.session_date,
});

export function useSessions() {
  const { data, setData, loading, error, reload } = useResource<Session[]>('/api/sessions', []);

  const createSession = async (payload: Partial<Session>) => {
    const response = await fetch(`${API_BASE_URL}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    if (!response.ok) {
      await reload();
      return;
    }
    const created = (await response.json()) as Session;
    setData((prev) => [...prev, normalizeSession(created)]);
  };

  const updateSession = async (id: string, payload: Partial<Session>) => {
    const response = await fetch(`${API_BASE_URL}/api/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    if (!response.ok) {
      await reload();
      return;
    }
    const updated = (await response.json()) as Session;
    const normalized = normalizeSession(updated);
    setData((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...normalized } : item)),
    );
  };

  const deleteSession = async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/api/sessions/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      await reload();
      return;
    }
    setData((prev) => prev.filter((item) => item.id !== id));
  };

  return {
    sessions: data,
    loading,
    error,
    reload,
    createSession,
    updateSession,
    deleteSession,
  };
}
