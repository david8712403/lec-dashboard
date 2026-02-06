'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Assessment, Payment, Student } from '@/types';
import { API_BASE_URL } from './useDashboardData';

export interface AssessmentWithStudent extends Assessment {
  student: Student;
}

export interface PaymentWithStudent extends Payment {
  student: Student;
}

export interface DashboardStats {
  totalStars: number;
  activeStudents: number;
  testingInProgress: AssessmentWithStudent[];
  unpaidCurrentMonth: PaymentWithStudent[];
}

export function useDashboardStats() {
  const apiBaseUrl = API_BASE_URL;
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const loadStats = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${apiBaseUrl}/api/dashboard/stats`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
      setError('無法載入統計資訊。');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  return { stats, loading, error, reload: loadStats };
}
