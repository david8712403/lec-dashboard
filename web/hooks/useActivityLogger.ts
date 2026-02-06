'use client';

import { ActivityLogEntry } from '@/types';
import { API_BASE_URL } from './useDashboardData';

export function useActivityLogger() {
  const logActivity = (category: ActivityLogEntry['category'], action: string, description: string) => {
    const newLog: ActivityLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      category,
      action,
      description,
      user: 'Teacher T',
    };

    void fetch(`${API_BASE_URL}/api/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLog),
    }).catch((error) => {
      console.warn('Failed to persist activity log:', error);
    });
  };

  return { logActivity };
}
