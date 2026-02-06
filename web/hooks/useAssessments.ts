'use client';

import { Assessment } from '@/types';
import { API_BASE_URL } from './useDashboardData';
import { useResource } from './useResource';

export function useAssessments() {
  const { data, loading, error, reload } = useResource<Assessment[]>('/api/assessments', []);

  const createAssessment = async (payload: Partial<Assessment>) => {
    await fetch(`${API_BASE_URL}/api/assessments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await reload();
  };

  const updateAssessment = async (id: string, payload: Partial<Assessment>) => {
    await fetch(`${API_BASE_URL}/api/assessments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await reload();
  };

  const deleteAssessment = async (id: string) => {
    await fetch(`${API_BASE_URL}/api/assessments/${id}`, { method: 'DELETE' });
    await reload();
  };

  return {
    assessments: data,
    loading,
    error,
    reload,
    createAssessment,
    updateAssessment,
    deleteAssessment,
  };
}
