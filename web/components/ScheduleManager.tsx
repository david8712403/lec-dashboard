'use client';

import { useMemo, useState } from 'react';
import { ScheduleGrid } from '@/components/ScheduleGrid';
import { useDashboardData } from '@/hooks/useDashboardData';
import { AttendanceStatus, StudentStatus } from '@/types';
import { useToast } from '@/components/Toast';

export function ScheduleManager() {
  const { toast } = useToast();
  const {
    students,
    slots,
    sessions,
    isLoading,
    loadError,
    createSession,
    updateSlot,
    deleteSlot,
    deleteSession,
  } = useDashboardData();
  const [isEditingSlots, setIsEditingSlots] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  const activeStudentIds = useMemo(
    () => new Set(students.filter((student) => student.status !== StudentStatus.SEPARATED).map((student) => student.id)),
    [students],
  );

  const visibleSlots = useMemo(
    () => slots.filter((slot) => activeStudentIds.has(slot.student_id)),
    [slots, activeStudentIds],
  );

  const visibleSessions = useMemo(
    () => sessions.filter((session) => activeStudentIds.has(session.student_id)),
    [sessions, activeStudentIds],
  );

  const sortedSlots = useMemo(
    () =>
      [...visibleSlots].sort((a, b) => {
        if (a.weekday !== b.weekday) return a.weekday - b.weekday;
        if (a.start_time !== b.start_time) return a.start_time.localeCompare(b.start_time);
        return a.end_time.localeCompare(b.end_time);
      }),
    [visibleSlots],
  );

  return (
    <section className="h-full p-4 md:p-6">
      <div className="rounded-2xl border border-[#c9d4ce] bg-[linear-gradient(120deg,#f4f8f6,#eef4f0)] p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg md:text-xl font-black text-[#1d2a26]">週課表</h1>
            <p className="mt-1 text-sm text-[#4a6159]">
              可直接查看每週課程，並切換到時段編輯模式拖拉調整個案固定排課時段。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditingSlots(false)}
              className={`rounded-lg px-3 py-2 text-sm font-bold ${
                !isEditingSlots ? 'bg-[#2f6a5b] text-white' : 'border border-[#b8c8bf] bg-white text-[#1f312a]'
              }`}
            >
              課程檢視
            </button>
            <button
              type="button"
              onClick={() => setIsEditingSlots(true)}
              className={`rounded-lg px-3 py-2 text-sm font-bold ${
                isEditingSlots ? 'bg-[#2f6a5b] text-white' : 'border border-[#b8c8bf] bg-white text-[#1f312a]'
              }`}
            >
              時段編輯（可拖拉）
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-[#c5d0ca] bg-white">
          {loadError && <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">{loadError}</div>}
          {isLoading ? (
            <div className="p-8 text-center text-sm text-[#5b6c66]">載入課表中...</div>
          ) : (
            <ScheduleGrid
              slots={sortedSlots}
              sessions={visibleSessions}
              students={students}
              isEditing={isEditingSlots}
              currentDate={currentDate}
              onWeekChange={setCurrentDate}
              showTitle={false}
              onUpdateSlot={async (id, payload) => {
                await updateSlot(id, payload);
                toast('已更新固定時段', 'success');
              }}
              onDeleteSlot={async (slot) => {
                const confirmed = window.confirm(`確定刪除 ${slot.start_time}-${slot.end_time} 固定時段嗎？`);
                if (!confirmed) return;
                await deleteSlot(slot.id);
                toast('已刪除固定時段', 'success');
              }}
              onDeleteSession={
                isEditingSlots
                  ? undefined
                  : async (session) => {
                      const confirmed = window.confirm(`確定刪除 ${session.session_date} ${session.start_time}-${session.end_time} 課程嗎？`);
                      if (!confirmed) return;
                      await deleteSession(session.id);
                      toast('已刪除課程', 'success');
                    }
              }
              onAddSession={
                isEditingSlots
                  ? undefined
                  : async (date, time, slotFromCell) => {
                      const dayOfWeek = new Date(date).getDay();
                      const weekday = dayOfWeek === 0 ? 7 : dayOfWeek;
                      const slot =
                        slotFromCell ??
                        sortedSlots.find(
                          (item) =>
                            item.weekday === weekday &&
                            item.start_time === time.start_time &&
                            item.end_time === time.end_time,
                        );
                      if (!slot) {
                        toast('請先在時段編輯模式建立固定排課。', 'warning');
                        return;
                      }
                      const exists = visibleSessions.some(
                        (item) =>
                          item.session_date === date &&
                          item.start_time === time.start_time &&
                          item.end_time === time.end_time &&
                          item.student_id === slot.student_id,
                      );
                      if (exists) return;
                      await createSession({
                        student_id: slot.student_id,
                        session_date: date,
                        start_time: time.start_time,
                        end_time: time.end_time,
                        attendance: AttendanceStatus.UNKNOWN,
                      });
                      toast('已加入課程', 'success');
                    }
              }
            />
          )}
        </div>
      </div>
    </section>
  );
}
