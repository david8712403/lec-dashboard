'use client'

import { PaymentList } from '@/components/PaymentList';
import { usePayments } from '@/hooks/usePayments';
import { useStudents } from '@/hooks/useStudents';
import { useAssessments } from '@/hooks/useAssessments';
import { useActivityLogger } from '@/hooks/useActivityLogger';

export default function PaymentsPage() {
  const { payments, loading: paymentsLoading, error: paymentsError, createPayment, updatePayment, deletePayment, reload: reloadPayments } = usePayments();
  const { students, loading: studentsLoading, error: studentsError } = useStudents();
  const { assessments, loading: assessmentsLoading, error: assessmentsError } = useAssessments();
  const { logActivity } = useActivityLogger();
  const isLoading = paymentsLoading || studentsLoading || assessmentsLoading;
  const loadError = paymentsError || studentsError || assessmentsError;

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
      <PaymentList
        payments={payments}
        students={students}
        assessments={assessments}
        onCreatePayment={createPayment}
        onUpdatePayment={updatePayment}
        onDeletePayment={deletePayment}
        onReload={reloadPayments}
        onLogActivity={(category, action, description) =>
          logActivity(category, action, description)
        }
      />
    </div>
  );
}
