'use client';

import { useEffect, useState } from 'react';
import { ActivityLogEntry } from '@/types';
import { API_BASE_URL } from './useDashboardData';

export interface ActivityQuery {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  user?: string;
  lineUid?: string;
  lineUids?: string[];
  users?: string[];
}

export function useActivities(query: ActivityQuery) {
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (query.page) params.set('page', String(query.page));
        if (query.pageSize) params.set('pageSize', String(query.pageSize));
        if (query.startDate) params.set('start_date', query.startDate);
        if (query.endDate) params.set('end_date', query.endDate);
        if (query.user) params.set('user', query.user);
        if (query.lineUid) params.set('line_uid', query.lineUid);
        if (query.lineUids && query.lineUids.length > 0) {
          params.set('line_uids', query.lineUids.join(','));
        }
        if (query.users && query.users.length > 0) {
          params.set('users', query.users.join(','));
        }
        const response = await fetch(`${API_BASE_URL}/api/activity?${params.toString()}`, {
          credentials: 'include',
        });
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const data = await response.json();
        if (!alive) return;
        setActivities(data.items ?? []);
        setTotal(data.total ?? 0);
      } catch (err) {
        console.error('Failed to load activities:', err);
        if (alive) {
          setError('無法連線到後端，請確認伺服器狀態。');
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, [query.page, query.pageSize, query.startDate, query.endDate, query.user, query.lineUid]);

  return {
    activities,
    total,
    loading,
    error,
  };
}

export async function fetchActivityOperators() {
  const response = await fetch(`${API_BASE_URL}/api/activity/operators`, {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json() as Promise<
    Array<{
      line_uid: string | null;
      user: string;
      user_display_name?: string | null;
      user_picture?: string | null;
    }>
  >;
}
