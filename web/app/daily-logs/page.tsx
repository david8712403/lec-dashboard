'use client'

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DailyLogManager } from '@/components/DailyLogManager';
import { useStudents } from '@/hooks/useStudents';
import { useSessions } from '@/hooks/useSessions';
import { useActivityLogger } from '@/hooks/useActivityLogger';

function DailyLogsContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const { students, loading: studentsLoading, error: studentsError } = useStudents();
  const { sessions, loading: sessionsLoading, error: sessionsError, updateSession } = useSessions();
  const { logActivity } = useActivityLogger();
  const isLoading =
    (studentsLoading && students.length === 0) ||
    (sessionsLoading && sessions.length === 0);
  const loadError = studentsError || sessionsError;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-gray-600">載入中...</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {loadError && (
        <div className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-4 py-2">
          {loadError}
        </div>
      )}
      <DailyLogManager
        sessions={sessions}
        students={students}
        onUpdateSession={updateSession}
        onLogActivity={logActivity}
        initialSessionId={sessionId || undefined}
      />
    </div>
  );
}

export default function DailyLogsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <div className="text-lg text-gray-600">載入中...</div>
        </div>
      }
    >
      <DailyLogsContent />
    </Suspense>
  );
}
