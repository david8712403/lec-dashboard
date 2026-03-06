'use client';

import { Session, SessionRecordStatus } from '@/types';
import { API_BASE_URL } from './useDashboardData';
import { useResource } from './useResource';

const normalizeSessionDate = (value?: string | null) => {
  if (!value) return value;
  return value.includes('T') ? value.split('T')[0] : value;
};

const normalizeSession = (session: Session): Session => ({
  ...session,
  session_date: normalizeSessionDate(session.session_date) ?? session.session_date,
  record_status: session.record_status ?? SessionRecordStatus.PENDING,
  completed_at: normalizeSessionDate(session.completed_at ?? undefined) ?? session.completed_at ?? null,
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

  const createSessionsForWeek = async (
    payload: {
      week_start?: string;
      weekStart?: string;
      anchor_date?: string;
      anchorDate?: string;
      tz_offset?: number;
      tzOffset?: number;
      student_id?: string;
      studentId?: string;
    },
    options?: { reloadAfter?: boolean },
  ) => {
    const shouldReload = options?.reloadAfter !== false;
    const response = await fetch(`${API_BASE_URL}/api/sessions/bulk-week`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    if (!response.ok) {
      if (shouldReload) {
        await reload();
      }
      throw new Error('bulk create sessions failed');
    }
    const result = (await response.json()) as {
      createdCount: number;
      weekStart: string;
      weekEnd: string;
    };
    if (shouldReload) {
      await reload();
    }
    return result;
  };

  return {
    sessions: data,
    loading,
    error,
    reload,
    createSession,
    updateSession,
    deleteSession,
    createSessionsForWeek,
  };
}
