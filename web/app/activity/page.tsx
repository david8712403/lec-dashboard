'use client'

import { ActivityLog } from '@/components/ActivityLog';
import { fetchActivityOperators, useActivities } from '@/hooks/useActivities';
import { useEffect, useMemo, useState } from 'react';

type OperatorOption = {
  id: string;
  label: string;
  line_uid: string | null;
  user: string;
  user_picture?: string | null;
};

const quickRanges = [
  { key: '1h', label: '近 1 小時', hours: 1 },
  { key: '4h', label: '近 4 小時', hours: 4 },
  { key: '8h', label: '近 8 小時', hours: 8 },
] as const;

export default function ActivityPage() {
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString());
  const [operatorOptions, setOperatorOptions] = useState<OperatorOption[]>([]);
  const [selectedOperators, setSelectedOperators] = useState<string[]>([]);
  const [operatorOpen, setOperatorOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<string>('24h');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    let alive = true;
    const loadOperators = async () => {
      try {
        const data = await fetchActivityOperators();
        if (!alive) return;
        const options = data.map((item) => ({
          id: item.line_uid ? `line:${item.line_uid}` : `user:${item.user}`,
          label: item.user_display_name || item.user,
          line_uid: item.line_uid,
          user: item.user,
          user_picture: item.user_picture ?? null,
        }));
        setOperatorOptions(options);
      } catch (error) {
        console.warn('Failed to load activity operators:', error);
      }
    };
    void loadOperators();
    return () => {
      alive = false;
    };
  }, []);

  const query = useMemo(() => {
    const lineUids = selectedOperators
      .filter((value) => value.startsWith('line:'))
      .map((value) => value.replace('line:', ''));
    const users = selectedOperators
      .filter((value) => value.startsWith('user:'))
      .map((value) => value.replace('user:', ''));
    return {
      page,
      pageSize,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      lineUids: lineUids.length > 0 ? lineUids : undefined,
      users: users.length > 0 ? users : undefined,
    };
  }, [page, pageSize, startDate, endDate, selectedOperators]);

  const { activities, total, loading: isLoading, error: loadError } = useActivities(query);

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const setRange = (start: Date, end: Date, preset?: string) => {
    setStartDate(start.toISOString());
    setEndDate(end.toISOString());
    setActivePreset(preset ?? '');
    setPage(1);
  };

  const handlePreset = (key: string) => {
    const now = new Date();
    if (key === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      setRange(start, now, key);
      return;
    }
    if (key === 'week') {
      const day = now.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const start = new Date(now);
      start.setDate(now.getDate() + diff);
      start.setHours(0, 0, 0, 0);
      setRange(start, now, key);
      return;
    }
    if (key === '24h') {
      const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      setRange(start, now, key);
      return;
    }
    const preset = quickRanges.find((item) => item.key === key);
    if (preset) {
      const start = new Date(now.getTime() - preset.hours * 60 * 60 * 1000);
      setRange(start, now, key);
    }
  };

  const shiftRange = (direction: -1 | 1) => {
    if (!startDate || !endDate) return;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return;
    const duration = end.getTime() - start.getTime();
    const nextStart = new Date(start.getTime() + duration * direction);
    const nextEnd = new Date(end.getTime() + duration * direction);
    setRange(nextStart, nextEnd, '');
  };

  useEffect(() => {
    if (!operatorOpen) return;
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest?.('[data-operator-dropdown]')) return;
      setOperatorOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => {
      window.removeEventListener('mousedown', handler);
    };
  }, [operatorOpen]);

  return (
    <div className="p-4 space-y-4">
      {loadError && (
        <div className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-4 py-2">
          {loadError}
        </div>
      )}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {quickRanges.map((preset) => (
            <button
              key={preset.key}
              onClick={() => handlePreset(preset.key)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                activePreset === preset.key
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {preset.label}
            </button>
          ))}
          <button
            onClick={() => handlePreset('24h')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
              activePreset === '24h'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            近 24 小時
          </button>
          <button
            onClick={() => handlePreset('today')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
              activePreset === 'today'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            今天
          </button>
          <button
            onClick={() => handlePreset('week')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
              activePreset === 'week'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            本週
          </button>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => shiftRange(-1)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              ←
            </button>
            <div className="text-xs text-slate-500">
              {startDate && endDate
                ? `${new Date(startDate).toLocaleString()} ~ ${new Date(endDate).toLocaleString()}`
                : '未設定範圍'}
            </div>
            <button
              onClick={() => shiftRange(1)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              →
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-2 lg:flex-row lg:items-end">
            <div className="relative" data-operator-dropdown>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">操作人員</label>
              <button
                type="button"
                onClick={() => setOperatorOpen((prev) => !prev)}
                className="mt-1 w-full min-w-[200px] rounded-lg border border-slate-200 px-3 py-2 text-sm text-left flex items-center justify-between"
              >
                <span className="text-slate-600">
                  {selectedOperators.length === 0 ? '全部人員' : `已選 ${selectedOperators.length} 人`}
                </span>
                <span className="text-slate-400">▾</span>
              </button>
              {operatorOpen && (
                <div className="absolute z-20 mt-2 w-full max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg p-2 space-y-1">
                  <button
                    type="button"
                    onClick={() => setSelectedOperators([])}
                    className="w-full text-left px-2 py-1 text-sm rounded-md hover:bg-slate-50"
                  >
                    全部人員
                  </button>
                  {operatorOptions.map((option) => {
                    const id = option.id;
                    const checked = selectedOperators.includes(id);
                    return (
                      <label
                        key={id}
                        className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-slate-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedOperators((prev) => [...prev, id]);
                            } else {
                              setSelectedOperators((prev) => prev.filter((item) => item !== id));
                            }
                            setPage(1);
                          }}
                        />
                        {option.user_picture ? (
                          <img
                            src={option.user_picture}
                            alt={option.label}
                            className="w-6 h-6 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                            {option.label.slice(0, 1)}
                          </div>
                        )}
                        <span className="text-sm text-slate-700">{option.label}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">每頁</label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                {[10, 20, 30, 50].map((size) => (
                  <option key={size} value={size}>
                    {size} 筆
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-sm text-slate-500">
          <div>
            共 {total} 筆，頁碼 {page} / {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={!canPrev}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50"
            >
              上一頁
            </button>
            <button
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={!canNext}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50"
            >
              下一頁
            </button>
          </div>
        </div>
      </div>
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-x-0 -top-3 flex justify-end pr-2">
            <span className="text-[11px] font-bold text-slate-400 bg-white border border-slate-200 rounded-full px-2 py-0.5 shadow-sm">
              更新中...
            </span>
          </div>
        )}
        <ActivityLog activities={activities} />
      </div>
    </div>
  );
}
