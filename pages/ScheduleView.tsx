import React, { useState, useMemo } from 'react';
import { MOCK_STUDENTS, MOCK_SLOTS, MOCK_SESSIONS } from '../services/mockData';
import { AttendanceStatus } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';

const HOURS = Array.from({ length: 13 }, (_, i) => i + 9); // 09:00 to 21:00
const WEEKDAYS = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];

export const ScheduleView: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2023, 9, 23)); // Mock date: Oct 23, 2023 (Monday)

  // Calculate the start of the week (Monday)
  const startOfWeek = useMemo(() => {
    const d = new Date(currentDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }, [currentDate]);

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [startOfWeek]);

  // Helper to format date for comparison YYYY-MM-DD
  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const handlePrevWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const handleNextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  const getStudentName = (id: string) => MOCK_STUDENTS.find(s => s.id === id)?.name || 'Unknown';

  // Core Logic: Map slots to grid cells
  const getCellData = (dayIndex: number, hour: number) => {
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    const targetDateStr = formatDate(weekDates[dayIndex]);
    
    // 1. Find Actual Session (Overrides Slot)
    const session = MOCK_SESSIONS.find(s => 
      s.session_date === targetDateStr && s.time_slot.startsWith(timeStr)
    );

    // 2. Find Fixed Schedule Slot
    // Note: weekday in DB is 1-7 (Mon-Sun), dayIndex is 0-6 (Mon-Sun) -> match dayIndex + 1
    const slot = MOCK_SLOTS.find(s => 
        s.weekday === dayIndex + 1 && s.time_slot.startsWith(timeStr)
    );

    return { session, slot };
  };

  const getSessionColor = (attendance: AttendanceStatus) => {
    switch (attendance) {
        case AttendanceStatus.PRESENT: return 'bg-emerald-100 border-emerald-200 text-emerald-800';
        case AttendanceStatus.ABSENT: return 'bg-rose-100 border-rose-200 text-rose-800';
        case AttendanceStatus.MAKEUP: return 'bg-blue-100 border-blue-200 text-blue-800';
        case AttendanceStatus.CANCELLED: return 'bg-slate-100 border-slate-200 text-slate-500 line-through';
        default: return 'bg-white border-slate-200';
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
        <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <CalendarIcon size={20} />
                課表檢視
            </h2>
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
                <button onClick={handlePrevWeek} className="p-1 hover:bg-white rounded shadow-sm transition-all"><ChevronLeft size={18}/></button>
                <span className="px-4 text-sm font-medium text-slate-700">
                    {formatDate(weekDates[0])} ~ {formatDate(weekDates[6])}
                </span>
                <button onClick={handleNextWeek} className="p-1 hover:bg-white rounded shadow-sm transition-all"><ChevronRight size={18}/></button>
            </div>
        </div>
        <div className="flex gap-2 text-xs">
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-100 border border-emerald-200 rounded"></div> 到課</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-slate-100 border border-slate-300 border-dashed rounded"></div> 固定時段</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-rose-100 border border-rose-200 rounded"></div> 請假</span>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto relative">
        <div className="min-w-[1000px]">
            {/* Weekday Header */}
            <div className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] sticky top-0 z-10 bg-slate-50 border-b border-slate-200 shadow-sm">
                <div className="p-3 border-r border-slate-200 flex items-center justify-center text-slate-400">
                    <Clock size={16} />
                </div>
                {WEEKDAYS.map((day, i) => (
                    <div key={day} className={`p-3 text-center border-r border-slate-200 last:border-r-0 ${
                        formatDate(new Date()) === formatDate(weekDates[i]) ? 'bg-indigo-50' : ''
                    }`}>
                        <div className="font-semibold text-slate-700">{day}</div>
                        <div className={`text-xs mt-1 ${
                            formatDate(new Date()) === formatDate(weekDates[i]) ? 'text-indigo-600 font-bold' : 'text-slate-500'
                        }`}>
                            {weekDates[i].getDate()}
                        </div>
                    </div>
                ))}
            </div>

            {/* Time Rows */}
            {HOURS.map(hour => (
                <div key={hour} className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] border-b border-slate-100 min-h-[100px]">
                    {/* Time Label */}
                    <div className="border-r border-slate-200 p-2 text-xs text-slate-500 text-right sticky left-0 bg-white z-0">
                        {hour}:00
                    </div>

                    {/* Day Cells */}
                    {WEEKDAYS.map((_, dayIndex) => {
                        const { session, slot } = getCellData(dayIndex, hour);
                        
                        return (
                            <div key={dayIndex} className="border-r border-slate-100 p-1 relative hover:bg-slate-50 transition-colors group">
                                {session ? (
                                    <button className={`w-full h-full rounded p-2 text-left border text-xs shadow-sm transition-transform hover:scale-[1.02] ${getSessionColor(session.attendance)}`}>
                                        <div className="font-bold">{getStudentName(session.student_id)}</div>
                                        <div>{session.attendance}</div>
                                        {session.teacher_name && <div className="text-[10px] opacity-75 mt-1">{session.teacher_name}</div>}
                                    </button>
                                ) : slot ? (
                                    <button className="w-full h-full rounded p-2 text-left border border-dashed border-slate-300 bg-slate-50 text-slate-500 text-xs hover:border-indigo-300 hover:text-indigo-600">
                                        <div className="font-bold">{getStudentName(slot.student_id)}</div>
                                        <div>預排</div>
                                        <div className="text-[10px] mt-1 opacity-75">未登記</div>
                                    </button>
                                ) : (
                                    <div className="w-full h-full opacity-0 group-hover:opacity-100 flex items-center justify-center">
                                        <button className="text-indigo-600 bg-indigo-50 rounded-full p-1 hover:bg-indigo-100">
                                            <div className="w-4 h-4 flex items-center justify-center text-xs">+</div>
                                        </button>
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
