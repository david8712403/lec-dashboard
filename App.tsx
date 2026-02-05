
import React, { useState } from 'react';
import { ViewState, ActivityLogEntry } from './types';
import { 
  mockStudents, 
  mockScheduleSlots, 
  mockSessions, 
  mockPayments, 
  mockAssessments 
} from './services/mockData';
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
  const [view, setView] = useState<ViewState>('SCHEDULE');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Application State (Mocked)
  const [students] = useState(mockStudents);
  const [slots] = useState(mockScheduleSlots);
  const [sessions] = useState(mockSessions);
  const [payments] = useState(mockPayments);
  const [assessments] = useState(mockAssessments);
  const [activities, setActivities] = useState<ActivityLogEntry[]>([
    {
      id: 'log-1',
      timestamp: new Date().toISOString().replace('T', ' ').split('.')[0],
      category: '個案',
      action: '系統初始化',
      description: '匯入初始個案資料與課表。',
      user: 'System'
    }
  ]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const logActivity = (category: ActivityLogEntry['category'], action: string, description: string) => {
    const newLog: ActivityLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      category,
      action,
      description,
      user: 'Teacher T'
    };
    setActivities(prev => [newLog, ...prev]);
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
              onLogActivity={(action, desc) => logActivity('個案', action, desc)}
            />
          )}

          {view === 'SCHEDULE' && (
            <ScheduleGrid 
              slots={slots}
              sessions={sessions}
              students={students}
              onAddSession={(date, time) => {
                logActivity('課程', '預排課程', `在 ${date} ${time} 預排了一堂課程。`);
              }}
            />
          )}

          {view === 'PAYMENTS' && (
            <PaymentList 
              payments={payments} 
              students={students} 
              onLogActivity={(action, desc) => logActivity('繳費', action, desc)}
            />
          )}

          {view === 'DAILY_LOGS' && (
             <DailyLogManager 
               sessions={sessions} 
               students={students} 
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
