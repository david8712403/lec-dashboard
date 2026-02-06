'use client'

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ScheduleGrid } from '@/components/ScheduleGrid';
import { useToast } from '@/components/Toast';
import { useStudents } from '@/hooks/useStudents';
import { useSlots } from '@/hooks/useSlots';
import { useSessions } from '@/hooks/useSessions';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { API_BASE_URL } from '@/hooks/useDashboardData';
import { AttendanceStatus } from '@/types';

const TIME_SLOTS = [
  { start_time: '09:00', end_time: '10:40' },
  { start_time: '10:40', end_time: '12:20' },
  { start_time: '12:00', end_time: '13:00' },
  { start_time: '13:00', end_time: '15:00' },
  { start_time: '15:00', end_time: '17:00' },
  { start_time: '17:00', end_time: '19:00' },
  { start_time: '19:00', end_time: '21:00' },
];

export default function SchedulePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { students, loading: studentsLoading, error: studentsError } = useStudents();
  const { slots, loading: slotsLoading, error: slotsError, createSlot, updateSlot, deleteSlot } = useSlots();
  const { sessions, loading: sessionsLoading, error: sessionsError, createSession, deleteSession, reload: reloadSessions } = useSessions();
  const { logActivity } = useActivityLogger();
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingSlot, setIsAddingSlot] = useState(false);
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [newSlot, setNewSlot] = useState({
    student_id: '',
    weekday: 1,
    start_time: TIME_SLOTS[0].start_time,
    end_time: TIME_SLOTS[0].end_time,
    note: '',
  });
  const isLoading = studentsLoading || slotsLoading || sessionsLoading;
  const loadError = studentsError || slotsError || sessionsError;
  const studentOptions = useMemo(() => students, [students]);

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
      <ScheduleGrid
        slots={slots.filter((slot) => students.find((s) => s.id === slot.student_id)?.status === '進行中')}
        sessions={sessions.filter((session) => students.find((s) => s.id === session.student_id)?.status === '進行中')}
        students={students.filter((student) => student.status === '進行中')}
        isEditing={isEditing}
        currentDate={currentDate}
        onWeekChange={setCurrentDate}
        headerActions={
          <>
            {isEditing && (
              <button
                type="button"
                onClick={() => {
                  setNewSlot({
                    student_id: '',
                    weekday: 1,
                    start_time: TIME_SLOTS[0].start_time,
                    end_time: TIME_SLOTS[0].end_time,
                    note: '',
                  });
                  setIsAddingSlot(true);
                }}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-all"
              >
                新增固定課表
              </button>
            )}
            <button
              type="button"
              onClick={async () => {
                if (isBulkAdding) return;
                setIsBulkAdding(true);
                try {
                  const weekStart = getWeekStart(currentDate);
                  const response = await fetch(`${API_BASE_URL}/api/sessions/bulk-week`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      week_start: formatLocalDate(weekStart),
                      tz_offset: new Date().getTimezoneOffset(),
                    }),
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
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all disabled:opacity-60"
              disabled={isBulkAdding}
            >
              {isBulkAdding ? '加入中...' : '一鍵加入當週課表'}
            </button>
            <button
              type="button"
              onClick={() => setIsEditing((prev) => !prev)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-all"
            >
              {isEditing ? '儲存課表' : '編輯固定課表'}
            </button>
          </>
        }
        onUpdateSlot={async (id, payload) => {
          await updateSlot(id, payload);
        }}
        onDeleteSlot={async (slot) => {
          const confirmed = window.confirm(`確定要刪除 ${students.find((s) => s.id === slot.student_id)?.name || '此個案'} 的固定課表嗎？`);
          if (!confirmed) return;
          await deleteSlot(slot.id);
          toast('已刪除固定課表。', 'success');
        }}
        showHeader
        showTitle={false}
        onSessionClick={(session) => {
          router.push(`/daily-logs?sessionId=${session.id}`);
        }}
        onDeleteSession={async (session) => {
          const confirmed = window.confirm(`確定要刪除 ${session.session_date} ${session.start_time}-${session.end_time} 的課程嗎？`);
          if (!confirmed) return;
          await deleteSession(session.id);
          toast('已刪除課程。', 'success');
        }}
        onAddSession={async (date, time, slotFromCell) => {
          const dayOfWeek = new Date(date).getDay();
          const weekday = dayOfWeek === 0 ? 7 : dayOfWeek;
          const slot = slotFromCell ?? slots.find(
            (s) =>
              s.weekday === weekday &&
              s.start_time === time.start_time &&
              s.end_time === time.end_time,
          );
          if (!slot) {
            toast('請先為此時段建立固定排課。', 'warning');
            return;
          }
          const existing = sessions.find(
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
          logActivity('課程', '預排課程', `在 ${date} ${time.start_time}-${time.end_time} 預排了一堂課程。`);
        }}
      />

      {isAddingSlot && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">新增固定課表</h3>
              <button onClick={() => setIsAddingSlot(false)} className="p-1 hover:bg-slate-200 rounded-full text-slate-400">✕</button>
            </div>
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                if (!newSlot.student_id) {
                  toast('請先選擇個案。', 'warning');
                  return;
                }
                await createSlot({
                  student_id: newSlot.student_id,
                  weekday: newSlot.weekday,
                  start_time: newSlot.start_time,
                  end_time: newSlot.end_time,
                  note: newSlot.note || undefined,
                });
                toast('已新增固定課表。', 'success');
                setIsAddingSlot(false);
              }}
              className="p-6 space-y-4 text-sm"
            >
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">個案</label>
                <select
                  className="w-full p-2 border rounded-lg bg-white"
                  value={newSlot.student_id}
                  onChange={(event) => setNewSlot({ ...newSlot, student_id: event.target.value })}
                  required
                >
                  <option value="">請選擇個案...</option>
                  {studentOptions.map((student) => (
                    <option key={student.id} value={student.id}>{student.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">星期</label>
                  <select
                    className="w-full p-2 border rounded-lg bg-white"
                    value={newSlot.weekday}
                    onChange={(event) => setNewSlot({ ...newSlot, weekday: Number(event.target.value) })}
                  >
                    <option value={1}>週一</option>
                    <option value={2}>週二</option>
                    <option value={3}>週三</option>
                    <option value={4}>週四</option>
                    <option value={5}>週五</option>
                    <option value={6}>週六</option>
                    <option value={7}>週日</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">時段</label>
                  <select
                    className="w-full p-2 border rounded-lg bg-white"
                    value={`${newSlot.start_time}-${newSlot.end_time}`}
                    onChange={(event) => {
                      const [start, end] = event.target.value.split('-');
                      setNewSlot({ ...newSlot, start_time: start, end_time: end });
                    }}
                  >
                    {TIME_SLOTS.map((slot) => (
                      <option key={`${slot.start_time}-${slot.end_time}`} value={`${slot.start_time}-${slot.end_time}`}>
                        {slot.start_time} - {slot.end_time}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">備註</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-lg"
                  value={newSlot.note}
                  onChange={(event) => setNewSlot({ ...newSlot, note: event.target.value })}
                />
              </div>
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddingSlot(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-sm transition-all"
                >
                  儲存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
