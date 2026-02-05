
import React, { useState, useMemo } from 'react';
import { ScheduleSlot, Session, AttendanceStatus, Student, TimeSlot } from '../types';
import { getDayOfWeek } from '../services/mockData';
import { PlusIcon, CameraIcon, ChevronLeftIcon } from './Icons';

interface ScheduleGridProps {
  slots: ScheduleSlot[];
  sessions: Session[];
  students: Student[];
  onAddSession: (date: string, time: TimeSlot) => void;
}

const timeSlots: TimeSlot[] = [
  '09:00 - 10:40',
  '10:40 - 12:20',
  '12:00 - 13:00',
  '13:00 - 15:00',
  '15:00 - 17:00',
  '17:00 - 19:00',
  '19:00 - 21:00'
];
const weekDays = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];

export const ScheduleGrid: React.FC<ScheduleGridProps> = ({ slots, sessions, students, onAddSession }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const weekDates = useMemo(() => {
    const d = new Date(currentDate);
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
  }, [currentDate]);

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const getCellData = (date: Date, time: TimeSlot) => {
    const dateStr = formatDate(date);
    const dayOfWeek = getDayOfWeek(dateStr);
    const session = sessions.find(s => s.session_date === dateStr && s.time_slot === time);
    const slot = slots.find(s => s.weekday === dayOfWeek && s.time_slot === time);
    return { session, slot };
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

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
      <div className="flex items-center justify-between p-4 border-b bg-slate-50/50">
        <h2 className="text-lg font-bold text-slate-800">週課表檢視</h2>
        <div className="flex items-center gap-3">
           <button 
            onClick={() => {
               const prev = new Date(currentDate);
               prev.setDate(prev.getDate() - 7);
               setCurrentDate(prev);
            }}
            className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition-all shadow-sm"
           >
             <ChevronLeftIcon className="w-4 h-4" />
           </button>
           <span className="text-sm font-bold text-slate-600 font-mono tracking-tight bg-white px-3 py-1 rounded-lg border border-slate-100 shadow-sm">
             {formatDate(weekDates[0])} ~ {formatDate(weekDates[6])}
           </span>
           <button 
            onClick={() => {
               const next = new Date(currentDate);
               next.setDate(next.getDate() + 7);
               setCurrentDate(next);
            }}
            className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition-all shadow-sm rotate-180"
           >
             <ChevronLeftIcon className="w-4 h-4" />
           </button>
        </div>
      </div>

      <div className="overflow-auto flex-1">
        <div className="min-w-[1000px]">
            <div className="grid grid-cols-8 border-b bg-slate-50 sticky top-0 z-20">
              <div className="p-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-r bg-slate-100">時段</div>
              {weekDays.map((day, i) => (
                <div key={day} className="p-3 text-center border-r last:border-r-0">
                  <div className="text-xs font-black text-slate-800 uppercase tracking-wider mb-0.5">{day}</div>
                  <div className="text-[10px] font-bold text-slate-400 font-mono">{weekDates[i].getDate()}日</div>
                </div>
              ))}
            </div>

            {timeSlots.map(time => (
              <div key={time} className="grid grid-cols-8 border-b last:border-b-0 min-h-[110px]">
                <div className="p-3 text-[10px] font-bold text-slate-500 border-r flex items-center justify-center bg-slate-50 text-center leading-tight">
                  {time}
                </div>
                {weekDates.map((date, i) => {
                  const { session, slot } = getCellData(date, time);
                  return (
                    <div 
                      key={i} 
                      className={`p-1.5 border-r last:border-r-0 relative group transition-all hover:bg-indigo-50/20 ${slot && !session ? 'bg-slate-50/30' : ''}`}
                      onClick={() => onAddSession(formatDate(date), time)}
                    >
                      {slot && !session && (
                        <div className="w-full h-full border-2 border-dashed border-slate-200 rounded-lg p-2 flex flex-col justify-center items-center text-slate-400 bg-white shadow-sm opacity-80 group-hover:opacity-100 transition-opacity">
                           <span className="text-xs font-bold text-slate-600">{getStudentName(slot.student_id)}</span>
                           <span className="text-[9px] font-bold uppercase tracking-widest mt-1 text-slate-400">預排課程</span>
                        </div>
                      )}

                      {session && (
                        <div className={`w-full h-full rounded-lg p-2 text-xs border cursor-pointer shadow-sm flex flex-col justify-between transition-transform hover:scale-[1.02] ${getAttendanceStyle(session.attendance)}`}>
                           <div>
                             <div className="font-bold truncate text-slate-800">{getStudentName(session.student_id)}</div>
                             <div className="text-[9px] opacity-75 font-bold uppercase tracking-wider">{session.teacher_name}</div>
                           </div>
                           <div className="flex justify-between items-end mt-2">
                              <div className="p-1 bg-white/50 rounded hover:bg-white/80 transition-colors">
                                <CameraIcon className="w-3 h-3 text-slate-600" />
                              </div>
                              <span className="text-[9px] font-black px-1.5 py-0.5 bg-white/40 rounded border border-white/20">{session.attendance}</span>
                           </div>
                        </div>
                      )}

                      {!session && !slot && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                            <PlusIcon className="w-6 h-6 text-indigo-300" />
                        </div>
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
