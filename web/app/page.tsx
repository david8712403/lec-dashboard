'use client'

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ScheduleGrid } from '@/components/ScheduleGrid';
import { AssessmentModal } from '@/components/AssessmentModal';
import { useStudents } from '@/hooks/useStudents';
import { useSlots } from '@/hooks/useSlots';
import { useSessions } from '@/hooks/useSessions';
import { useDashboardStats, AssessmentWithStudent, PaymentWithStudent } from '@/hooks/useDashboardStats';
import { CalendarIcon, CheckCircleIcon, CreditCardIcon, StarIcon, XIcon } from '@/components/Icons';
import { API_BASE_URL } from '@/hooks/useDashboardData';
import { AttendanceStatus, InvoiceStatus, PaymentMethod, PaymentStatus } from '@/types';
import { useToast } from '@/components/Toast';

export default function DashboardPage() {
  const router = useRouter();
  const { students, loading: studentsLoading, error: studentsError } = useStudents();
  const { slots, loading: slotsLoading, error: slotsError } = useSlots();
  const { sessions, loading: sessionsLoading, error: sessionsError, createSession, deleteSession, reload: reloadSessions } = useSessions();
  const { toast } = useToast();
  const [scheduleDate, setScheduleDate] = useState(new Date());
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const isLoading = studentsLoading || slotsLoading || sessionsLoading;
  const loadError = studentsError || slotsError || sessionsError;
  const activeStudentIds = useMemo(
    () => new Set(students.filter((s) => s.status === '進行中').map((s) => s.id)),
    [students],
  );
  const activeSlots = useMemo(
    () => slots.filter((slot) => activeStudentIds.has(slot.student_id)),
    [slots, activeStudentIds],
  );
  const activeSessions = useMemo(
    () => sessions.filter((session) => activeStudentIds.has(session.student_id)),
    [sessions, activeStudentIds],
  );
  const { stats, loading: statsLoading, error: statsError, reload: reloadStats } = useDashboardStats();
  const [activeAssessment, setActiveAssessment] = useState<AssessmentWithStudent | null>(null);
  const [editingPayment, setEditingPayment] = useState<PaymentWithStudent | null>(null);

  const loading = isLoading || statsLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-gray-600">載入中...</div>
      </div>
    );
  }

  const handleAssessmentSaved = () => {
    reloadStats();
    setActiveAssessment(null);
  };

  const getWeekStart = (value: Date) => {
    const day = value.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const start = new Date(value);
    start.setDate(start.getDate() + diff);
    return new Date(start.getFullYear(), start.getMonth(), start.getDate());
  };

  const formatLocalDate = (value: Date) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handlePaymentSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingPayment?.id) return;
    try {
      await fetch(`${API_BASE_URL}/api/payments/${editingPayment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month_ref: editingPayment.month_ref,
          amount: editingPayment.amount,
          sessions_count: editingPayment.sessions_count,
          status: editingPayment.status,
          paid_at: editingPayment.paid_at,
          invoice_status: editingPayment.invoice_status,
          method: editingPayment.method,
          note: editingPayment.note,
        }),
        credentials: 'include',
      });
      toast('已更新繳費明細。', 'success');
      await reloadStats();
      setEditingPayment(null);
    } catch (error) {
      console.error('Failed to update payment:', error);
      toast('更新繳費明細失敗。', 'error');
    }
  };

  const handlePaymentDelete = async () => {
    if (!editingPayment?.id) return;
    const confirmed = window.confirm('確定要刪除這筆繳費紀錄嗎？');
    if (!confirmed) return;
    try {
      await fetch(`${API_BASE_URL}/api/payments/${editingPayment.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      toast('已刪除繳費紀錄。', 'success');
      await reloadStats();
      setEditingPayment(null);
    } catch (error) {
      console.error('Failed to delete payment:', error);
      toast('刪除繳費紀錄失敗。', 'error');
    }
  };

  return (
    <div className="p-4 space-y-6">
      {(loadError || statsError) && (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-4 py-2">
          {loadError || statsError}
        </div>
      )}

      {editingPayment && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">編輯繳費明細</h3>
              <button onClick={() => setEditingPayment(null)} className="p-1 hover:bg-slate-200 rounded-full text-slate-400">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handlePaymentSave} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">個案姓名</label>
                <div className="p-2 bg-slate-50 border rounded-lg font-bold text-slate-700">
                  {students.find((s) => s.id === editingPayment.student_id)?.name || editingPayment.student?.name || '未知個案'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">對應月份</label>
                  <input
                    type="month"
                    className="w-full p-2 border rounded-lg"
                    value={editingPayment.month_ref || ''}
                    onChange={(e) => setEditingPayment({ ...editingPayment, month_ref: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">繳費狀態</label>
                  <select
                    className="w-full p-2 border rounded-lg bg-white font-bold"
                    value={editingPayment.status || PaymentStatus.UNPAID}
                    onChange={(e) => setEditingPayment({ ...editingPayment, status: e.target.value as PaymentStatus })}
                  >
                    {Object.values(PaymentStatus).map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">繳費日期</label>
                  <input
                    type="date"
                    className="w-full p-2 border rounded-lg"
                    value={editingPayment.paid_at || ''}
                    onChange={(e) => setEditingPayment({ ...editingPayment, paid_at: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">繳費方式</label>
                  <select
                    className="w-full p-2 border rounded-lg bg-white"
                    value={editingPayment.method || PaymentMethod.CASH}
                    onChange={(e) => setEditingPayment({ ...editingPayment, method: e.target.value as PaymentMethod })}
                  >
                    {Object.values(PaymentMethod).map((method) => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">開票狀態</label>
                  <select
                    className="w-full p-2 border rounded-lg bg-white"
                    value={editingPayment.invoice_status || InvoiceStatus.NOT_ISSUED}
                    onChange={(e) => setEditingPayment({ ...editingPayment, invoice_status: e.target.value as InvoiceStatus })}
                  >
                    {Object.values(InvoiceStatus).map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">當月堂數</label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded-lg"
                    value={editingPayment.sessions_count || 0}
                    onChange={(e) => setEditingPayment({ ...editingPayment, sessions_count: parseInt(e.target.value, 10) })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">實收金額</label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded-lg font-black text-indigo-600"
                    value={editingPayment.amount || 0}
                    onChange={(e) => setEditingPayment({ ...editingPayment, amount: parseInt(e.target.value, 10) })}
                  />
                  <div className="mt-1 text-[9px] font-bold text-slate-400">
                    預設月費: ${students.find((s) => s.id === editingPayment.student_id)?.default_fee?.toLocaleString() || 0}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">備註事項</label>
                <textarea
                  className="w-full p-2 border rounded-lg h-20 text-xs"
                  placeholder="如：現金支付、包含教材費、補課扣除等..."
                  value={editingPayment.note || ''}
                  onChange={(e) => setEditingPayment({ ...editingPayment, note: e.target.value })}
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={handlePaymentDelete}
                  className="flex-1 px-4 py-2 border border-red-200 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 transition-all"
                >
                  刪除
                </button>
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 shadow-lg shadow-amber-200 transition-all"
                >
                  儲存紀錄
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="星星總數"
          value={stats?.totalStars ?? 0}
          icon={<StarIcon className="w-5 h-5" />}
          tone="indigo"
        />
        <StatCard
          title="進行中"
          value={stats?.activeStudents ?? 0}
          icon={<CheckCircleIcon className="w-5 h-5" />}
          tone="emerald"
        />
        <StatCard
          title="測驗進行中"
          value={stats?.testingInProgress?.length ?? 0}
          icon={<CalendarIcon className="w-5 h-5" />}
          tone="amber"
        />
        <StatCard
          title="本月未繳"
          value={stats?.unpaidCurrentMonth?.length ?? 0}
          icon={<CreditCardIcon className="w-5 h-5" />}
          tone="rose"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-indigo-600" />
              本週課表
            </h2>
          </div>
          <ScheduleGrid
            slots={activeSlots}
            sessions={activeSessions}
            students={students}
            currentDate={scheduleDate}
            onWeekChange={setScheduleDate}
            headerActions={
              <>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  點擊課程可進入紀錄
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    if (isBulkAdding) return;
                    setIsBulkAdding(true);
                    try {
                      const weekStart = getWeekStart(scheduleDate);
                      const response = await fetch(`${API_BASE_URL}/api/sessions/bulk-week`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          week_start: formatLocalDate(weekStart),
                          tz_offset: new Date().getTimezoneOffset(),
                        }),
                        credentials: 'include',
                      });
                      if (!response.ok) {
                        throw new Error(`API error: ${response.status}`);
                      }
                      const data = await response.json();
                      await reloadSessions();
                      toast(`已加入當週課表 ${data.createdCount ?? 0} 筆。`, 'success');
                    } catch (error) {
                      console.error('Failed to bulk create sessions:', error);
                      toast('一鍵加入當週課表失敗。', 'error');
                    } finally {
                      setIsBulkAdding(false);
                    }
                  }}
                  className="px-2.5 py-1.5 text-[10px] font-bold rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all disabled:opacity-60"
                  disabled={isBulkAdding}
                >
                  {isBulkAdding ? '加入中...' : '一鍵加入當週課表'}
                </button>
              </>
            }
            onSessionClick={(session) => router.push(`/daily-logs?sessionId=${session.id}`)}
            onDeleteSession={async (session) => {
              const confirmed = window.confirm(`確定要刪除 ${session.session_date} ${session.start_time}-${session.end_time} 的課程嗎？`);
              if (!confirmed) return;
              await deleteSession(session.id);
              toast('已刪除課程。', 'success');
            }}
            onAddSession={async (date, time, slotFromCell) => {
              const dayOfWeek = new Date(date).getDay();
              const weekday = dayOfWeek === 0 ? 7 : dayOfWeek;
              const slot = slotFromCell ?? activeSlots.find(
                (s) =>
                  s.weekday === weekday &&
                  s.start_time === time.start_time &&
                  s.end_time === time.end_time,
              );
              if (!slot) {
                toast('請先固定排課。', 'warning');
                return;
              }
              const existing = activeSessions.find(
                (s) =>
                  s.session_date === date &&
                  s.start_time === time.start_time &&
                  s.end_time === time.end_time &&
                  s.student_id === slot.student_id,
              );
              if (existing) {
                router.push(`/daily-logs?sessionId=${existing.id}`);
                return;
              }
              await createSession({
                student_id: slot.student_id,
                session_date: date,
                start_time: time.start_time,
                end_time: time.end_time,
                attendance: AttendanceStatus.UNKNOWN,
              });
              toast('已建立上課紀錄。', 'success');
            }}
            showHeader
            showTitle={false}
          />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-slate-50/50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">測驗進行中</h2>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              {stats?.testingInProgress?.length ?? 0} 筆
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b">
                <tr>
                  <th className="p-3">學生</th>
                  <th className="p-3">狀態</th>
                  <th className="p-3">日期</th>
                  <th className="p-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats?.testingInProgress?.map((assessment: AssessmentWithStudent) => (
                  <tr key={assessment.id} className="hover:bg-slate-50 transition-all">
                    <td className="p-3 font-bold text-slate-700">{assessment.student?.name}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        assessment.status === '分析中'
                          ? 'bg-blue-50 text-blue-700 border-blue-100'
                          : assessment.status === '待諮詢'
                          ? 'bg-amber-50 text-amber-700 border-amber-100'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        {assessment.status}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-slate-500 font-mono">{assessment.assessed_at}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setActiveAssessment(assessment)}
                        className="text-xs font-bold text-indigo-600 hover:underline"
                      >
                        填寫結果
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!stats?.testingInProgress || stats.testingInProgress.length === 0) && (
              <div className="p-8 text-center text-xs text-slate-400">目前無測驗進行中的個案</div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-slate-50/50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">本月未繳費用</h2>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            {stats?.unpaidCurrentMonth?.length ?? 0} 筆
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b">
              <tr>
                <th className="p-4">學生</th>
                <th className="p-4">月份</th>
                <th className="p-4">金額</th>
                <th className="p-4">堂數</th>
                <th className="p-4 text-right">管理</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats?.unpaidCurrentMonth?.map((payment: PaymentWithStudent) => (
                <tr key={payment.id} className="hover:bg-slate-50 transition-all">
                  <td className="p-4 font-bold text-slate-700">{payment.student?.name}</td>
                  <td className="p-4 font-mono text-xs text-slate-600">{payment.month_ref}</td>
                  <td className="p-4 font-black text-slate-800">${payment.amount.toLocaleString()}</td>
                  <td className="p-4 text-slate-600">{payment.sessions_count || '-'}</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => setEditingPayment(payment)}
                      className="text-xs font-bold text-amber-600 hover:underline"
                    >
                      編輯
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!stats?.unpaidCurrentMonth || stats.unpaidCurrentMonth.length === 0) && (
            <div className="p-8 text-center text-xs text-slate-400">本月目前沒有未繳項目</div>
          )}
        </div>
      </div>

      {activeAssessment && (
        <AssessmentModal
          assessment={activeAssessment}
          studentId={activeAssessment.student_id}
          studentName={activeAssessment.student?.name}
          onClose={() => setActiveAssessment(null)}
          onSave={handleAssessmentSaved}
        />
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: number;
  icon: ReactNode;
  tone: 'indigo' | 'emerald' | 'amber' | 'rose';
}) {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
      <div>
        <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{title}</div>
        <div className="text-3xl font-black text-slate-800 mt-2">{value}</div>
      </div>
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${tones[tone]}`}>
        {icon}
      </div>
    </div>
  );
}
