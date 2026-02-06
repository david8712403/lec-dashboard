
import React, { useState, useMemo } from 'react';
import { ScheduleSlot, Session, AttendanceStatus, Student, TimeSlot } from '../types';
import { getDayOfWeek } from '../utils/date';
import { PlusIcon, CameraIcon, ChevronLeftIcon, TrashIcon } from './Icons';

interface ScheduleGridProps {
  slots: ScheduleSlot[];
  sessions: Session[];
  students: Student[];
  onAddSession?: (date: string, time: TimeSlot, slot?: ScheduleSlot) => void;
  onSessionClick?: (session: Session) => void;
  onDeleteSession?: (session: Session) => void;
  onUpdateSlot?: (id: string, payload: Partial<ScheduleSlot>) => void | Promise<void>;
  onDeleteSlot?: (slot: ScheduleSlot) => void | Promise<void>;
  isEditing?: boolean;
  currentDate?: Date;
  onWeekChange?: (date: Date) => void;
  showHeader?: boolean;
  showTitle?: boolean;
  headerActions?: React.ReactNode;
}

const timeSlots: TimeSlot[] = [
  { start_time: '09:00', end_time: '10:40' },
  { start_time: '10:40', end_time: '12:20' },
  { start_time: '12:00', end_time: '13:00' },
  { start_time: '13:00', end_time: '15:00' },
  { start_time: '15:00', end_time: '17:00' },
  { start_time: '17:00', end_time: '19:00' },
  { start_time: '19:00', end_time: '21:00' },
];
const weekDays = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];

const compactTime = (value: string) => value.replace(':', '');

export const ScheduleGrid: React.FC<ScheduleGridProps> = ({
  slots,
  sessions,
  students,
  onAddSession,
  onSessionClick,
  onDeleteSession,
  onUpdateSlot,
  onDeleteSlot,
  isEditing = false,
  currentDate,
  onWeekChange,
  showHeader = true,
  showTitle = true,
  headerActions,
}) => {
  const [internalDate, setInternalDate] = useState(new Date());
  const activeDate = currentDate ?? internalDate;
  const setDate = onWeekChange ?? setInternalDate;
  const [draggingSlotId, setDraggingSlotId] = useState<string | null>(null);

  const weekDates = useMemo(() => {
    const d = new Date(activeDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    
    const dates = [];
    for(let i=0; i<7; i++) {
      const temp = new Date(monday);
      temp.setDate(monday.getDate() + i);
      dates.push(temp);
    }
    return dates;
  }, [activeDate]);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getCellData = (date: Date, time: TimeSlot) => {
    const dateStr = formatDate(date);
    const dayOfWeek = getDayOfWeek(dateStr);
    const sessionsInCell = sessions.filter(
      (s) => s.session_date === dateStr && s.start_time === time.start_time && s.end_time === time.end_time,
    );
    const slotsInCell = slots.filter(
      (s) => s.weekday === dayOfWeek && s.start_time === time.start_time && s.end_time === time.end_time,
    );
    return { dateStr, dayOfWeek, sessionsInCell, slotsInCell };
  };

  const getStudentName = (id: string) => students.find(s => s.id === id)?.name || '未知';

  const getAttendanceStyle = (status: AttendanceStatus) => {
    switch(status) {
      case AttendanceStatus.PRESENT: return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case AttendanceStatus.ABSENT: return 'bg-red-50 text-red-800 border-red-200';
      case AttendanceStatus.MAKEUP: return 'bg-purple-50 text-purple-800 border-purple-200';
      default: return 'bg-slate-50 text-slate-800 border-slate-200';
    }
  };

  const handleEmptyCellClick = (date: Date, time: TimeSlot) => {
    onAddSession?.(formatDate(date), time);
  };

  const handleDragStart = (slot: ScheduleSlot) => (event: React.DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData('text/plain', slot.id);
    event.dataTransfer.effectAllowed = 'move';
    setDraggingSlotId(slot.id);
  };

  const handleDragEnd = () => {
    setDraggingSlotId(null);
  };

  const handleDrop = (weekday: number, time: TimeSlot) => async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const slotId = event.dataTransfer.getData('text/plain') || draggingSlotId;
    if (!slotId) return;
    const slot = slots.find((item) => item.id === slotId);
    if (!slot) return;
    const nextWeekday = weekday;
    if (
      slot.weekday === nextWeekday &&
      slot.start_time === time.start_time &&
      slot.end_time === time.end_time
    ) {
      return;
    }
    await onUpdateSlot?.(slot.id, {
      weekday: nextWeekday,
      start_time: time.start_time,
      end_time: time.end_time,
    });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200">
      {showHeader && (
        <div className="p-3 border-b bg-slate-50/50">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              {showTitle && <h2 className="text-base font-bold text-slate-800">課表</h2>}
              <div className="flex items-center gap-3">
             <button 
              onClick={() => {
                 const prev = new Date(activeDate);
                 prev.setDate(prev.getDate() - 7);
                 setDate(prev);
              }}
              className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition-all shadow-sm"
             >
               <ChevronLeftIcon className="w-4 h-4" />
             </button>
             <span className="text-xs font-bold text-slate-600 font-mono tracking-tight bg-white px-2.5 py-1 rounded-lg border border-slate-100 shadow-sm">
               {formatDate(weekDates[0])} ~ {formatDate(weekDates[6])}
             </span>
             <button 
              onClick={() => {
                 const next = new Date(activeDate);
                 next.setDate(next.getDate() + 7);
                 setDate(next);
              }}
              className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition-all shadow-sm rotate-180"
             >
               <ChevronLeftIcon className="w-4 h-4" />
             </button>
              </div>
            </div>
            {headerActions && (
              <div className="flex flex-wrap items-center gap-2">
                {headerActions}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto overflow-y-visible flex-1">
        <div className="min-w-[720px]">
            <div className="grid grid-cols-[70px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] border-b bg-slate-50/95 sticky top-0 z-10 shadow-sm backdrop-blur">
              <div className="p-2 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest border-r bg-slate-100">時段</div>
              {weekDays.map((day, i) => (
                <div key={day} className="p-2 text-center border-r last:border-r-0">
                  <div className="text-[11px] font-black text-slate-800 uppercase tracking-wider mb-0.5">{day}</div>
                  {!isEditing && (
                    <div className="text-[9px] font-bold text-slate-400 font-mono">{weekDates[i].getDate()}日</div>
                  )}
                </div>
              ))}
            </div>

            {timeSlots.map((time) => (
              <div key={`${time.start_time}-${time.end_time}`} className="grid grid-cols-[70px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] border-b last:border-b-0 min-h-[86px]">
                <div className="p-2 text-[9px] font-bold text-slate-500 border-r flex flex-col items-start justify-center bg-slate-50 text-left leading-tight">
                  <span className="font-mono">{compactTime(time.start_time)}-</span>
                  <span className="font-mono">{compactTime(time.end_time)}</span>
                </div>
                {weekDates.map((date, i) => {
                  const { dateStr, dayOfWeek, sessionsInCell, slotsInCell } = getCellData(date, time);
                  const scheduledIds = new Set(sessionsInCell.map((s) => s.student_id));
                  const openSlots = slotsInCell.filter((slot) => !scheduledIds.has(slot.student_id));
                  return (
                    <div 
                      key={i} 
                      className={`p-1 border-r last:border-r-0 relative group transition-all hover:bg-indigo-50/20 ${slotsInCell.length > 0 && sessionsInCell.length === 0 ? 'bg-slate-50/30' : ''}`}
                      onDragOver={isEditing ? (event) => event.preventDefault() : undefined}
                      onDrop={isEditing ? handleDrop(dayOfWeek, time) : undefined}
                    >
                      <div className="flex flex-col gap-1.5">
                        {isEditing
                          ? slotsInCell.map((slot) => (
                              <div
                                key={slot.id}
                                draggable
                                onDragStart={handleDragStart(slot)}
                                onDragEnd={handleDragEnd}
                                className={`w-full rounded-lg p-1.5 text-[11px] border text-left shadow-sm flex items-center justify-between bg-white text-slate-700 cursor-move transition-transform ${draggingSlotId === slot.id ? 'opacity-60' : ''}`}
                              >
                                <span className="font-bold truncate">{getStudentName(slot.student_id)}</span>
                                <span className="flex items-center gap-1">
                                  <span className="text-[9px] text-slate-400">固定</span>
                                  {onDeleteSlot && (
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        onDeleteSlot(slot);
                                      }}
                                      className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-red-600 transition-colors"
                                    >
                                      <TrashIcon className="w-3 h-3" />
                                    </button>
                                  )}
                                </span>
                              </div>
                            ))
                          : sessionsInCell.map((session) => (
                              <button
                                key={session.id}
                                type="button"
                                onClick={() => onSessionClick?.(session)}
                                className={`w-full rounded-lg p-1.5 text-[11px] border text-left shadow-sm flex flex-col justify-between transition-transform hover:scale-[1.01] ${getAttendanceStyle(session.attendance)}`}
                              >
                                 <div className="flex items-start justify-between gap-2">
                                   <div className="font-bold truncate text-slate-800">{getStudentName(session.student_id)}</div>
                                   {onDeleteSession && (
                                     <span
                                       onClick={(event) => {
                                         event.stopPropagation();
                                         onDeleteSession?.(session);
                                       }}
                                       className="p-0.5 rounded hover:bg-white/70 text-slate-400 hover:text-red-600 transition-colors"
                                     >
                                       <TrashIcon className="w-3 h-3" />
                                     </span>
                                   )}
                                 </div>
                                 <div className="text-[9px] opacity-75 font-bold uppercase tracking-wider">{session.teacher_name}</div>
                                 <div className="flex justify-between items-end mt-2">
                                    <div className="p-1 bg-white/50 rounded hover:bg-white/80 transition-colors">
                                      <CameraIcon className="w-3 h-3 text-slate-600" />
                                    </div>
                                    <span className="text-[9px] font-black px-1.5 py-0.5 bg-white/40 rounded border border-white/20">{session.attendance}</span>
                                 </div>
                              </button>
                            ))}

                        {!isEditing && openSlots.map((slot) => (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => onAddSession?.(dateStr, time, slot)}
                            className="w-full border-2 border-dashed border-slate-200 rounded-lg p-1.5 flex flex-col justify-center items-center text-slate-400 bg-white shadow-sm opacity-80 hover:opacity-100 transition-opacity"
                          >
                             <span className="text-[11px] font-bold text-slate-600">{getStudentName(slot.student_id)}</span>
                             <span className="text-[9px] font-bold uppercase tracking-widest mt-1 text-slate-400">加入課程</span>
                          </button>
                        ))}
                      </div>

                      {!isEditing && sessionsInCell.length === 0 && openSlots.length === 0 && (
                        <button
                          type="button"
                          onClick={() => handleEmptyCellClick(date, time)}
                          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                        >
                            <PlusIcon className="w-6 h-6 text-indigo-300" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
