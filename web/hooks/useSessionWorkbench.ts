'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Session, SessionRecordStatus, Student } from '@/types';
import { API_BASE_URL } from './useDashboardData';

export type WorkbenchView = 'today' | 'week';
export type WorkbenchStatus = 'pending' | 'all';

export interface SessionWorkbenchItem {
  date: string;
  start_time: string;
  end_time: string;
  student_id: string;
  student: Student;
  session: Session | null;
}

interface WorkbenchResponse {
  date?: string;
  view?: WorkbenchView;
  status?: WorkbenchStatus;
  total?: number;
  items?: SessionWorkbenchItem[];
}

const toItemKey = (item: {
  student_id: string;
  date: string;
  start_time: string;
  end_time: string;
}) => `${item.student_id}|${item.date}|${item.start_time}|${item.end_time}`;

const toSessionKey = (session: Session) =>
  `${session.student_id}|${session.session_date}|${session.start_time}|${session.end_time}`;

const sortItems = (items: SessionWorkbenchItem[]) =>
  [...items].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    const startCompare = a.start_time.localeCompare(b.start_time);
    if (startCompare !== 0) return startCompare;
    const endCompare = a.end_time.localeCompare(b.end_time);
    if (endCompare !== 0) return endCompare;
    return (a.student?.name || '').localeCompare(b.student?.name || '', 'zh-Hant');
  });

const normalizeSession = (session: Session): Session => ({
  ...session,
  session_date: session.session_date?.includes('T')
    ? session.session_date.split('T')[0]
    : session.session_date,
  completed_at: session.completed_at
    ? session.completed_at.includes('T')
      ? session.completed_at.split('T')[0]
      : session.completed_at
    : null,
  record_status: session.record_status ?? SessionRecordStatus.PENDING,
  attachments: Array.isArray(session.attachments) ? session.attachments : [],
});

export function useSessionWorkbench(options?: {
  initialDate?: string;
  initialView?: WorkbenchView;
  initialStatus?: WorkbenchStatus;
}) {
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [date, setDate] = useState(options?.initialDate || today);
  const [view, setView] = useState<WorkbenchView>(options?.initialView || 'today');
  const [status, setStatus] = useState<WorkbenchStatus>(options?.initialStatus || 'pending');
  const [items, setItems] = useState<SessionWorkbenchItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const updateSessionInItems = useCallback((session: Session) => {
    const normalized = normalizeSession(session);
    const sessionKey = toSessionKey(normalized);
    setItems((prev) => {
      let found = false;
      const next = prev.map((item) => {
        const sameId = item.session?.id === normalized.id;
        const sameKey = toItemKey(item) === sessionKey;
        if (!sameId && !sameKey) return item;
        found = true;
        return {
          ...item,
          session: normalized,
        };
      });
      const merged = found ? next : prev;
      const filtered =
        status === 'pending'
          ? merged.filter(
              (item) =>
                !item.session ||
                item.session.record_status !== SessionRecordStatus.DONE,
            )
          : merged;
      setTotal(filtered.length);
      return sortItems(filtered);
    });
  }, [status]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        date,
        view,
        status,
      });
      const response = await fetch(`${API_BASE_URL}/api/sessions/workbench?${params.toString()}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const data = (await response.json()) as WorkbenchResponse;
      const normalized = (data.items || []).map((item) => ({
        ...item,
        session: item.session ? normalizeSession(item.session) : null,
      }));
      setItems(sortItems(normalized));
      setTotal(data.total ?? normalized.length);
    } catch (err) {
      console.error('Failed to load session workbench:', err);
      setError('無法載入課務清單。');
    } finally {
      setLoading(false);
    }
  }, [date, view, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const quickOpen = useCallback(async (item: SessionWorkbenchItem) => {
    const response = await fetch(`${API_BASE_URL}/api/sessions/quick-open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        student_id: item.student_id,
        session_date: item.date,
        start_time: item.start_time,
        end_time: item.end_time,
      }),
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data = (await response.json()) as { session: Session };
    const normalized = normalizeSession(data.session);
    updateSessionInItems(normalized);
    return normalized;
  }, [updateSessionInItems]);

  const quickSave = useCallback(async (sessionId: string, payload: Partial<Session>) => {
    const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/quick`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data = (await response.json()) as { session: Session };
    const normalized = normalizeSession(data.session);
    updateSessionInItems(normalized);
    return normalized;
  }, [updateSessionInItems]);

  const complete = useCallback(async (sessionId: string) => {
    const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/complete`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data = (await response.json()) as { session: Session };
    const normalized = normalizeSession(data.session);
    updateSessionInItems(normalized);
    return normalized;
  }, [updateSessionInItems]);

  const generateSummary = useCallback(async (sessionId: string) => {
    const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/summary`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `API error: ${response.status}`);
    }
    const data = (await response.json()) as { summary: string; session: Session };
    const normalized = normalizeSession(data.session);
    updateSessionInItems(normalized);
    return {
      summary: data.summary,
      session: normalized,
    };
  }, [updateSessionInItems]);

  const pendingItems = useMemo(
    () =>
      items.filter(
        (item) => !item.session || item.session.record_status !== SessionRecordStatus.DONE,
      ),
    [items],
  );

  const nextPendingAfter = useCallback((sessionId?: string | null) => {
    if (!sessionId) return pendingItems[0] ?? null;
    const index = pendingItems.findIndex((item) => item.session?.id === sessionId);
    if (index === -1) return pendingItems[0] ?? null;
    return pendingItems[index + 1] ?? null;
  }, [pendingItems]);

  return {
    date,
    view,
    status,
    items,
    total,
    loading,
    error,
    pendingItems,
    setDate,
    setView,
    setStatus,
    reload: load,
    quickOpen,
    quickSave,
    complete,
    generateSummary,
    nextPendingAfter,
  };
}
