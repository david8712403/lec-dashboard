'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityLogEntry,
  Assessment,
  Payment,
  ScheduleSlot,
  Session,
  Student,
} from '@/types';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

const fetchWithAuth = (input: RequestInfo | URL, init?: RequestInit) =>
  fetch(input, { ...init, credentials: 'include' });

export function useDashboardData() {
  const apiBaseUrl = API_BASE_URL;
  const [students, setStudents] = useState<Student[]>([]);
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const loadDashboard = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      setIsLoading(true);
      setLoadError(null);
      const [
        studentsRes,
        slotsRes,
        sessionsRes,
        paymentsRes,
        assessmentsRes,
        activitiesRes,
      ] = await Promise.all([
        fetchWithAuth(`${apiBaseUrl}/api/students`),
        fetchWithAuth(`${apiBaseUrl}/api/slots`),
        fetchWithAuth(`${apiBaseUrl}/api/sessions`),
        fetchWithAuth(`${apiBaseUrl}/api/payments`),
        fetchWithAuth(`${apiBaseUrl}/api/assessments`),
        fetchWithAuth(`${apiBaseUrl}/api/activity`),
      ]);

      const responses = [
        studentsRes,
        slotsRes,
        sessionsRes,
        paymentsRes,
        assessmentsRes,
        activitiesRes,
      ];

      const failed = responses.find((res) => !res.ok);
      if (failed) {
        throw new Error(`API error: ${failed.status}`);
      }

      const [
        studentsData,
        slotsData,
        sessionsData,
        paymentsData,
        assessmentsData,
        activitiesData,
      ] = await Promise.all(responses.map((res) => res.json()));

      setStudents(studentsData ?? []);
      setSlots(slotsData ?? []);
      setSessions(sessionsData ?? []);
      setPayments(paymentsData ?? []);
      setAssessments(assessmentsData ?? []);
      setActivities(Array.isArray(activitiesData) ? activitiesData : activitiesData?.items ?? []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setLoadError('無法連線到後端，請確認伺服器狀態。');
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const logActivity = (category: ActivityLogEntry['category'], action: string, description: string) => {
    const newLog: ActivityLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      category,
      action,
      description,
      user: 'Teacher T',
    };
    setActivities((prev) => [newLog, ...prev]);
    void fetchWithAuth(`${apiBaseUrl}/api/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLog),
    }).catch((error) => {
      console.warn('Failed to persist activity log:', error);
    });
  };

  const createStudent = async (payload: Partial<Student>) => {
    await fetchWithAuth(`${apiBaseUrl}/api/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await loadDashboard();
  };

  const updateStudent = async (id: string, payload: Partial<Student>) => {
    await fetchWithAuth(`${apiBaseUrl}/api/students/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await loadDashboard();
  };

  const deleteStudent = async (id: string) => {
    await fetchWithAuth(`${apiBaseUrl}/api/students/${id}`, { method: 'DELETE' });
    await loadDashboard();
  };

  const createSlot = async (payload: Partial<ScheduleSlot>) => {
    await fetchWithAuth(`${apiBaseUrl}/api/slots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await loadDashboard();
  };

  const updateSlot = async (id: string, payload: Partial<ScheduleSlot>) => {
    await fetchWithAuth(`${apiBaseUrl}/api/slots/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await loadDashboard();
  };

  const deleteSlot = async (id: string) => {
    await fetchWithAuth(`${apiBaseUrl}/api/slots/${id}`, { method: 'DELETE' });
    await loadDashboard();
  };

  const createPayment = async (payload: Partial<Payment>) => {
    await fetchWithAuth(`${apiBaseUrl}/api/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await loadDashboard();
  };

  const updatePayment = async (id: string, payload: Partial<Payment>) => {
    await fetchWithAuth(`${apiBaseUrl}/api/payments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await loadDashboard();
  };

  const deletePayment = async (id: string) => {
    await fetchWithAuth(`${apiBaseUrl}/api/payments/${id}`, { method: 'DELETE' });
    await loadDashboard();
  };

  const createAssessment = async (payload: Partial<Assessment>) => {
    await fetchWithAuth(`${apiBaseUrl}/api/assessments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await loadDashboard();
  };

  const updateAssessment = async (id: string, payload: Partial<Assessment>) => {
    await fetchWithAuth(`${apiBaseUrl}/api/assessments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await loadDashboard();
  };

  const deleteAssessment = async (id: string) => {
    await fetchWithAuth(`${apiBaseUrl}/api/assessments/${id}`, { method: 'DELETE' });
    await loadDashboard();
  };

  const createSession = async (payload: Partial<Session>) => {
    await fetchWithAuth(`${apiBaseUrl}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await loadDashboard();
  };

  const updateSession = async (id: string, payload: Partial<Session>) => {
    await fetchWithAuth(`${apiBaseUrl}/api/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await loadDashboard();
  };

  return {
    apiBaseUrl,
    students,
    slots,
    sessions,
    payments,
    assessments,
    activities,
    isLoading,
    loadError,
    reload: loadDashboard,
    logActivity,
    createStudent,
    updateStudent,
    deleteStudent,
    createSlot,
    updateSlot,
    deleteSlot,
    createPayment,
    updatePayment,
    deletePayment,
    createAssessment,
    updateAssessment,
    deleteAssessment,
    createSession,
    updateSession,
  };
}
