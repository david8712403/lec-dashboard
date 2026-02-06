'use client';

import { ActivityLogEntry } from '@/types';
import { useResource } from './useResource';

export function useActivities() {
  const { data, loading, error, reload } = useResource<ActivityLogEntry[]>('/api/activity', []);

  return {
    activities: data,
    loading,
    error,
    reload,
  };
}
