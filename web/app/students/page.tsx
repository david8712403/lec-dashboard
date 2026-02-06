'use client'

import { StudentManager } from '@/components/StudentManager';
import { useStudents } from '@/hooks/useStudents';
import { useSlots } from '@/hooks/useSlots';
import { useSessions } from '@/hooks/useSessions';
import { usePayments } from '@/hooks/usePayments';
import { useAssessments } from '@/hooks/useAssessments';
import { useActivityLogger } from '@/hooks/useActivityLogger';

export default function StudentsPage() {
  const { students, loading: studentsLoading, error: studentsError, createStudent, updateStudent, deleteStudent } = useStudents();
  const { slots, loading: slotsLoading, error: slotsError, createSlot, updateSlot, deleteSlot } = useSlots();
  const { sessions, loading: sessionsLoading, error: sessionsError } = useSessions();
  const { payments, loading: paymentsLoading, error: paymentsError, createPayment, updatePayment, deletePayment } = usePayments();
  const { assessments, loading: assessmentsLoading, error: assessmentsError, createAssessment, updateAssessment, deleteAssessment } = useAssessments();
  const { logActivity } = useActivityLogger();
  const isLoading = studentsLoading || slotsLoading || sessionsLoading || paymentsLoading || assessmentsLoading;
  const loadError = studentsError || slotsError || sessionsError || paymentsError || assessmentsError;

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
      <StudentManager
        students={students}
        assessments={assessments}
        payments={payments}
        slots={slots}
        sessions={sessions}
        onCreateStudent={createStudent}
        onUpdateStudent={updateStudent}
        onDeleteStudent={deleteStudent}
        onCreateSlot={createSlot}
        onUpdateSlot={updateSlot}
        onDeleteSlot={deleteSlot}
        onCreatePayment={createPayment}
        onUpdatePayment={updatePayment}
        onDeletePayment={deletePayment}
        onCreateAssessment={createAssessment}
        onUpdateAssessment={updateAssessment}
        onDeleteAssessment={deleteAssessment}
        onLogActivity={(category, action, description) =>
          logActivity(category, action, description)
        }
      />
    </div>
  );
}
