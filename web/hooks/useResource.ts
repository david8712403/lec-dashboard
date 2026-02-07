'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from './useDashboardData';

export function useResource<T>(endpoint: string, initialValue: T) {
  const [data, setData] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);
  const initialRef = useRef(initialValue);

  const load = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const json = await response.json();
      setData(json ?? initialRef.current);
    } catch (err) {
      console.error(`Failed to load ${endpoint}:`, err);
      setError('無法連線到後端，請確認伺服器狀態。');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [endpoint]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    data,
    setData,
    loading,
    error,
    reload: load,
  };
}
