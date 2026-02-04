import React from 'react';
import { Users, Calendar, CreditCard, Activity, Box } from 'lucide-react';
import { ViewState } from '../types';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView }) => {
  const navItems = [
    { id: 'students', label: '個案管理', icon: Users },
    { id: 'schedule', label: '課表檢視', icon: Calendar },
    { id: 'payments', label: '繳費紀錄', icon: CreditCard },
    { id: 'assessments', label: '檢測紀錄', icon: Activity },
  ];

  return (
    <div className="w-64 bg-white border-r border-slate-200 h-screen flex flex-col sticky top-0">
      <div className="p-6 flex items-center gap-2 border-b border-slate-100">
        <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
            <Box size={20} />
        </div>
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">CaseManager</h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onChangeView(item.id as ViewState)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
              currentView === item.id || (currentView === 'student-detail' && item.id === 'students')
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <item.icon size={18} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                DA
            </div>
            <div>
                <p className="text-sm font-medium text-slate-700">David Admin</p>
                <p className="text-xs text-slate-400">系統管理員</p>
            </div>
        </div>
      </div>
    </div>
  );
};
