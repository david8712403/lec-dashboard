
import React from 'react';
import { ActivityLogEntry } from '../types';
import { HistoryIcon, UsersIcon, CreditCardIcon, FileTextIcon } from './Icons';

interface ActivityLogProps {
  activities: ActivityLogEntry[];
}

export const ActivityLog: React.FC<ActivityLogProps> = ({ activities }) => {
  const sortedActivities = [...activities].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const formatTimestamp = (value: string) => {
    if (!value) return '';
    if (value.includes('T')) {
      const date = new Date(value);
      if (isNaN(date.getTime())) return value.replace('T', ' ').split('.')[0];
      const diffMs = Date.now() - date.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMs >= 0 && diffDays < 3) {
        if (diffSeconds < 60) return '剛剛';
        if (diffMinutes < 60) return `${diffMinutes} 分鐘前`;
        if (diffHours < 24) return `${diffHours} 小時前`;
        return `${diffDays} 天前`;
      }
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(date);
    }
    return value;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case '個案': return <UsersIcon className="w-4 h-4 text-emerald-600" />;
      case '繳費': return <CreditCardIcon className="w-4 h-4 text-amber-600" />;
      case '課程': return <FileTextIcon className="w-4 h-4 text-blue-600" />;
      default: return <HistoryIcon className="w-4 h-4 text-slate-600" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case '個案': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case '繳費': return 'bg-amber-50 text-amber-700 border-amber-100';
      case '課程': return 'bg-blue-50 text-blue-700 border-blue-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/20">
        {sortedActivities.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-40 text-center">
            <HistoryIcon className="w-16 h-16 mb-4 text-slate-300" />
            <p className="font-bold text-slate-500">目前尚無異動紀錄</p>
          </div>
        ) : (
          <div className="relative max-w-4xl mx-auto">
            {/* Vertical timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-200"></div>
            
            <div className="space-y-10 relative">
              {sortedActivities.map((entry) => (
                <div key={entry.id} className="flex gap-6 group">
                  {/* Timeline Icon Container */}
                  <div className={`relative z-10 w-12 h-12 rounded-2xl border border-white flex items-center justify-center shadow-md shrink-0 transition-transform group-hover:scale-110 ${getCategoryColor(entry.category)}`}>
                    {getCategoryIcon(entry.category)}
                    {/* Pulsing effect for the newest log */}
                    {sortedActivities[0].id === entry.id && <div className="absolute inset-0 rounded-2xl bg-current opacity-20 animate-ping"></div>}
                  </div>

                  {/* Content Box */}
                  <div className="flex-1 pt-1">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border uppercase tracking-widest ${getCategoryColor(entry.category)}`}>
                          {entry.category}
                        </span>
                        <span className="font-bold text-slate-800 text-base">{entry.action}</span>
                      </div>
                      <span className="text-[10px] font-bold font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">{formatTimestamp(entry.timestamp)}</span>
                    </div>
                    
                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm transition-shadow group-hover:shadow-md">
                      <p className="text-sm text-slate-600 leading-relaxed font-medium">
                        "{entry.description}"
                      </p>
                      <div className="mt-4 pt-3 border-t border-slate-50 flex justify-end items-center gap-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">紀錄執行人員:</span>
                        <div className="flex items-center gap-1.5">
                           {entry.user_picture ? (
                             <img
                               src={entry.user_picture}
                               alt={entry.user_display_name || entry.user}
                               className="w-5 h-5 rounded-full object-cover border border-slate-200"
                             />
                           ) : (
                             <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[9px] font-bold">
                               {(entry.user_display_name || entry.user || 'U').slice(0, 1)}
                             </div>
                           )}
                           <span className="text-xs font-bold text-slate-700">
                             {entry.user_display_name || entry.user}
                           </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
