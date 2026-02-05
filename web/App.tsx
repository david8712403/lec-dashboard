
'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ViewState, ActivityLogEntry, Student, ScheduleSlot, Session, Payment, Assessment, AttendanceStatus } from './types';
import { StudentManager } from './components/StudentManager';
import { ScheduleGrid } from './components/ScheduleGrid';
import { PaymentList } from './components/PaymentList';
import { DailyLogManager } from './components/DailyLogManager';
import { ActivityLog } from './components/ActivityLog';
import { AIAssistant } from './components/AIAssistant';
import { 
  UsersIcon, 
  CalendarIcon, 
  CreditCardIcon, 
  MenuIcon, 
  XIcon,
  FileTextIcon,
  HistoryIcon
} from './components/Icons';

export default function App() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3004';
  const [view, setView] = useState<ViewState>('SCHEDULE');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [students, setStudents] = useState<Student[]>([]);
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);

  const loadDashboard = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      setIsLoading(true);
      setLoadError(null);
      const response = await fetch(`${apiBaseUrl}/api/dashboard`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();
      setStudents(data.students ?? []);
      setSlots(data.slots ?? []);
      setSessions(data.sessions ?? []);
      setPayments(data.payments ?? []);
      setAssessments(data.assessments ?? []);
      setActivities(data.activities ?? []);
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

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const logActivity = (category: ActivityLogEntry['category'], action: string, description: string) => {
    const newLog: ActivityLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      category,
      action,
      description,
      user: 'Teacher T'
    };
    setActivities(prev => [newLog, ...prev]);
    void fetch(`${apiBaseUrl}/api/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLog),
    }).catch((error) => {
      console.warn('Failed to persist activity log:', error);
    });
  };

  const createStudent = async (payload: Partial<Student>) => {
    await fetch(`${apiBaseUrl}/api/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await loadDashboard();
  };

  const updateStudent = async (id: string, payload: Partial<Student>) => {
    await fetch(`${apiBaseUrl}/api/students/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await loadDashboard();
  };

  const deleteStudent = async (id: string) => {
    await fetch(`${apiBaseUrl}/api/students/${id}`, { method: 'DELETE' });
    await loadDashboard();
  };

  const createSlot = async (payload: Partial<ScheduleSlot>) => {
    await fetch(`${apiBaseUrl}/api/slots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await loadDashboard();
  };

  const updateSlot = async (id: string, payload: Partial<ScheduleSlot>) => {
    await fetch(`${apiBaseUrl}/api/slots/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await loadDashboard();
  };

  const deleteSlot = async (id: string) => {
    await fetch(`${apiBaseUrl}/api/slots/${id}`, { method: 'DELETE' });
    await loadDashboard();
  };

  const createPayment = async (payload: Partial<Payment>) => {
    await fetch(`${apiBaseUrl}/api/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await loadDashboard();
  };

  const updatePayment = async (id: string, payload: Partial<Payment>) => {
    await fetch(`${apiBaseUrl}/api/payments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await loadDashboard();
  };

  const deletePayment = async (id: string) => {
    await fetch(`${apiBaseUrl}/api/payments/${id}`, { method: 'DELETE' });
    await loadDashboard();
  };

  const createAssessment = async (payload: Partial<Assessment>) => {
    await fetch(`${apiBaseUrl}/api/assessments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await loadDashboard();
  };

  const updateAssessment = async (id: string, payload: Partial<Assessment>) => {
    await fetch(`${apiBaseUrl}/api/assessments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await loadDashboard();
  };

  const deleteAssessment = async (id: string) => {
    await fetch(`${apiBaseUrl}/api/assessments/${id}`, { method: 'DELETE' });
    await loadDashboard();
  };

  const createSession = async (payload: Partial<Session>) => {
    await fetch(`${apiBaseUrl}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await loadDashboard();
  };

  const updateSession = async (id: string, payload: Partial<Session>) => {
    await fetch(`${apiBaseUrl}/api/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await loadDashboard();
  };

  const NavItem = ({ target, icon: Icon, label }: { target: ViewState, icon: any, label: string }) => (
    <button
      onClick={() => {
        setView(target);
        if (window.innerWidth < 768) setIsSidebarOpen(false);
      }}
      className={`flex items-center gap-3 w-full p-3 rounded-lg mb-1 transition-all overflow-hidden whitespace-nowrap ${
        view === target 
          ? 'bg-primary text-white shadow-md shadow-primary/30' 
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      }`}
      title={!isSidebarOpen ? label : ''}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className={`font-medium transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 md:hidden'}`}>
        {label}
      </span>
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed md:relative z-30 h-full bg-white border-r flex flex-col transition-all duration-300 ease-in-out
        ${isSidebarOpen ? 'w-64 translate-x-0' : '-translate-x-full md:translate-x-0 md:w-20'}
      `}>
        <div className="p-4 border-b h-16 flex items-center justify-between">
          {isSidebarOpen ? (
            <h1 className="text-xl font-black text-primary tracking-tight truncate">LEC Dashboard</h1>
          ) : (
            <div className="w-full flex justify-center text-primary font-black">LEC</div>
          )}
          <button onClick={toggleSidebar} className="md:hidden text-slate-500">
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 p-3 space-y-2">
          <NavItem target="SCHEDULE" icon={CalendarIcon} label="課表檢視" />
          <NavItem target="DAILY_LOGS" icon={FileTextIcon} label="上課紀錄" />
          <NavItem target="STUDENTS" icon={UsersIcon} label="個案管理" />
          <NavItem target="PAYMENTS" icon={CreditCardIcon} label="繳費管理" />
          <NavItem target="ACTIVITY_LOG" icon={HistoryIcon} label="活動紀錄" />
        </nav>

        {isSidebarOpen && (
          <div className="p-4 border-t text-xs text-center text-slate-400">
            LEC System v1.1
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col min-w-0 relative">
        <header className="bg-white h-16 border-b flex items-center px-4 justify-between shrink-0">
           <div className="flex items-center gap-3">
             <button onClick={toggleSidebar} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
               <MenuIcon className="w-6 h-6" />
             </button>
             <h2 className="text-lg font-bold text-slate-700">
               {view === 'SCHEDULE' && '課表檢視'}
               {view === 'DAILY_LOGS' && '上課狀況與 Review'}
               {view === 'STUDENTS' && '個案管理'}
               {view === 'PAYMENTS' && '繳費管理'}
               {view === 'ACTIVITY_LOG' && '活動紀錄'}
             </h2>
           </div>
           <div className="flex items-center gap-2">
             {isLoading && (
               <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
                 資料載入中...
               </span>
             )}
             {loadError && (
               <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                 {loadError}
               </span>
             )}
             <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
               T
             </div>
           </div>
        </header>

        <div className="flex-1 overflow-hidden p-2 md:p-6 bg-slate-100">
          {view === 'STUDENTS' && (
            <StudentManager 
              students={students} 
              payments={payments}
              assessments={assessments}
              slots={slots}
              sessions={sessions}
              apiBaseUrl={apiBaseUrl}
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
              onLogActivity={(action, desc) => logActivity('個案', action, desc)}
            />
          )}

          {view === 'SCHEDULE' && (
            <ScheduleGrid 
              slots={slots}
              sessions={sessions}
              students={students}
              onAddSession={async (date, time) => {
                const existing = sessions.find(
                  (s) => s.session_date === date && s.time_slot === time,
                );
                if (existing) {
                  return;
                }
                const dayOfWeek = new Date(date).getDay();
                const weekday = dayOfWeek === 0 ? 7 : dayOfWeek;
                const slot = slots.find((s) => s.weekday === weekday && s.time_slot === time);
                if (!slot) {
                  alert('請先為此時段建立固定排課。');
                  return;
                }
                await createSession({
                  student_id: slot.student_id,
                  session_date: date,
                  time_slot: time,
                  attendance: AttendanceStatus.UNKNOWN,
                });
                logActivity('課程', '預排課程', `在 ${date} ${time} 預排了一堂課程。`);
              }}
            />
          )}

          {view === 'PAYMENTS' && (
            <PaymentList 
              payments={payments} 
              students={students} 
              apiBaseUrl={apiBaseUrl}
              onCreatePayment={createPayment}
              onUpdatePayment={updatePayment}
              onDeletePayment={deletePayment}
              onLogActivity={(action, desc) => logActivity('繳費', action, desc)}
            />
          )}

          {view === 'DAILY_LOGS' && (
             <DailyLogManager 
               sessions={sessions} 
               students={students} 
               apiBaseUrl={apiBaseUrl}
               onUpdateSession={updateSession}
               onLogActivity={logActivity} 
             />
          )}

          {view === 'ACTIVITY_LOG' && (
            <ActivityLog activities={activities} />
          )}
        </div>

        <AIAssistant />
      </main>
    </div>
  );
}
