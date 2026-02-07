'use client';

import { Student } from '@/types';
import { API_BASE_URL } from './useDashboardData';
import { useResource } from './useResource';

export function useStudents() {
  const { data, loading, error, reload } = useResource<Student[]>('/api/students', []);

  const createStudent = async (payload: Partial<Student>) => {
    await fetch(`${API_BASE_URL}/api/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    await reload();
  };

  const updateStudent = async (id: string, payload: Partial<Student>) => {
    await fetch(`${API_BASE_URL}/api/students/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    await reload();
  };

  const deleteStudent = async (id: string) => {
    await fetch(`${API_BASE_URL}/api/students/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    await reload();
  };

  return {
    students: data,
    loading,
    error,
    reload,
    createStudent,
    updateStudent,
    deleteStudent,
  };
}
