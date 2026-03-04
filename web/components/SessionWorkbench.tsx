'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AttendanceStatus, Session, SessionRecordStatus } from '@/types';
import { useToast } from './Toast';
import { useSessionWorkbench, WorkbenchStatus, WorkbenchView, SessionWorkbenchItem } from '@/hooks/useSessionWorkbench';
import { CalendarIcon, CheckCircleIcon, XIcon } from './Icons';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const attendanceButtons = [
  { value: AttendanceStatus.PRESENT, label: '到課', tone: 'bg-[#2f6a5b] text-white border-[#2f6a5b]' },
  { value: AttendanceStatus.ABSENT, label: '請假', tone: 'bg-[#b6514a] text-white border-[#b6514a]' },
  { value: AttendanceStatus.MAKEUP, label: '補課', tone: 'bg-[#4f7a91] text-white border-[#4f7a91]' },
  { value: AttendanceStatus.CANCELED, label: '停課', tone: 'bg-[#6a766f] text-white border-[#6a766f]' },
  { value: AttendanceStatus.UNKNOWN, label: '未登記', tone: 'bg-white text-[var(--ink-muted)] border-[var(--line-soft)]' },
];

const statusLabel = (item: SessionWorkbenchItem) => {
  if (!item.session) return '未建立';
  return item.session.record_status;
};

const statusTone = (item: SessionWorkbenchItem) => {
  if (!item.session) return 'bg-slate-100 text-slate-600 border-slate-200';
  if (item.session.record_status === SessionRecordStatus.DONE) {
    return 'bg-[#ebf3ef] text-[#2f6a5b] border-[#d3e2da]';
  }
  if (item.session.record_status === SessionRecordStatus.IN_PROGRESS) {
    return 'bg-[#f7f2e8] text-[#8b6c2d] border-[#eadfca]';
  }
  return 'bg-[#e9f0ee] text-[#355f52] border-[#d1ddd9]';
};

const toKey = (item: Pick<SessionWorkbenchItem, 'student_id' | 'date' | 'start_time' | 'end_time'>) =>
  `${item.student_id}|${item.date}|${item.start_time}|${item.end_time}`;

export function SessionWorkbench(props?: {
  initialDate?: string;
  initialView?: WorkbenchView;
  initialStatus?: WorkbenchStatus;
}) {
  const { toast } = useToast();
  const {
    date,
    view,
    status,
    items,
    pendingItems,
    loading,
    error,
    setDate,
    setView,
    setStatus,
    quickOpen,
    quickSave,
    complete,
    generateSummary,
    nextPendingAfter,
  } = useSessionWorkbench({
    initialDate: props?.initialDate,
    initialView: props?.initialView,
    initialStatus: props?.initialStatus,
  });

  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const saveTimerRef = useRef<number | null>(null);
  const pendingPatchRef = useRef<Partial<Session>>({});

  const activeItem = useMemo(() => {
    if (!activeKey) return null;
    return items.find((item) => toKey(item) === activeKey) || null;
  }, [activeKey, items]);

  useEffect(() => {
    if (!activeSession?.id) return;
    const latest = items
      .map((item) => item.session)
      .find((session) => session?.id === activeSession.id);
    if (latest) {
      setActiveSession(latest);
    }
  }, [items, activeSession?.id]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const flushSave = useCallback(async () => {
    if (!activeSession?.id) return;
    const payload = pendingPatchRef.current;
    if (!payload || Object.keys(payload).length === 0) return;
    pendingPatchRef.current = {};
    setSaveState('saving');
    try {
      const updated = await quickSave(activeSession.id, payload);
      setActiveSession(updated);
      setSaveState('saved');
      window.setTimeout(() => {
        setSaveState((prev) => (prev === 'saved' ? 'idle' : prev));
      }, 800);
    } catch (err) {
      console.error('Failed to quick save session:', err);
      setSaveState('error');
      toast('自動儲存失敗，請稍後再試。', 'error');
    }
  }, [activeSession, quickSave, toast]);

  const scheduleSave = useCallback((patch: Partial<Session>) => {
    setActiveSession((prev) => (prev ? { ...prev, ...patch } : prev));
    pendingPatchRef.current = {
      ...pendingPatchRef.current,
      ...patch,
    };
    setSaveState('saving');
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      void flushSave();
    }, 600);
  }, [flushSave]);

  const openItem = useCallback(async (item: SessionWorkbenchItem) => {
    try {
      setActiveKey(toKey(item));
      let session = item.session;
      if (!session) {
        const opened = await quickOpen(item);
        session = opened;
      }
      setActiveSession(session);
      setSaveState('idle');
      pendingPatchRef.current = {};
      const desktop = window.matchMedia('(min-width: 768px)').matches;
      setIsDrawerOpen(!desktop);
    } catch (err) {
      console.error('Failed to open session:', err);
      toast('無法開啟課堂紀錄。', 'error');
    }
  }, [quickOpen, toast]);

  const closeDrawer = useCallback(async () => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    await flushSave();
    setIsDrawerOpen(false);
    setActiveSession(null);
    setActiveKey(null);
    pendingPatchRef.current = {};
  }, [flushSave]);

  const handleAttendanceClick = useCallback(async (attendance: AttendanceStatus) => {
    if (!activeSession?.id) return;
    try {
      setSaveState('saving');
      const updated = await quickSave(activeSession.id, {
        attendance,
      });
      setActiveSession(updated);
      setSaveState('saved');
      window.setTimeout(() => {
        setSaveState((prev) => (prev === 'saved' ? 'idle' : prev));
      }, 600);
    } catch (err) {
      console.error('Failed to update attendance:', err);
      setSaveState('error');
      toast('更新出勤狀態失敗。', 'error');
    }
  }, [activeSession, quickSave, toast]);

  const handleGenerateSummary = useCallback(async () => {
    if (!activeSession?.id) return;
    if (!activeSession.performance_log?.trim()) {
      toast('請先填寫上課表現紀錄。', 'warning');
      return;
    }
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    await flushSave();
    setIsGenerating(true);
    try {
      const result = await generateSummary(activeSession.id);
      setActiveSession(result.session);
      toast('已更新 PC 摘要。', 'success');
    } catch (err) {
      console.error('Failed to generate summary:', err);
      toast('摘要產生失敗，請稍後再試。', 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [activeSession, flushSave, generateSummary, toast]);

  const handleComplete = useCallback(async () => {
    if (!activeSession?.id || isCompleting) return;
    setIsCompleting(true);
    try {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      await flushSave();
      await complete(activeSession.id);
      toast('已完成本堂紀錄。', 'success');
      window.setTimeout(() => {
        const next = nextPendingAfter(activeSession.id);
        if (next) {
          void openItem(next);
          return;
        }
        setIsDrawerOpen(false);
        setActiveSession(null);
        setActiveKey(null);
        toast('今日待處理課堂已完成。', 'success');
      }, 0);
    } catch (err) {
      console.error('Failed to complete session:', err);
      toast('完成課堂失敗。', 'error');
    } finally {
      setIsCompleting(false);
    }
  }, [activeSession, complete, flushSave, isCompleting, nextPendingAfter, openItem, toast]);

  return (
    <div className="h-full flex flex-col bg-[var(--bg-base)]">
      <div className="sticky top-0 z-10 bg-[var(--bg-surface)] border-b border-[var(--line-soft)] px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-base md:text-lg font-extrabold text-[var(--ink-main)] flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-[var(--brand)]" />
            今日課務
          </h1>
          <span className="text-[11px] font-bold text-[var(--ink-muted)] bg-[#eef2ee] rounded-full px-2 py-1">
            待處理 {pendingItems.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('today')}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-bold transition-all ${
              view === 'today'
                ? 'bg-[var(--brand)] text-white border-[var(--brand)]'
                : 'bg-white text-[var(--ink-muted)] border-[var(--line-soft)]'
            }`}
          >
            今日
          </button>
          <button
            onClick={() => setView('week')}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-bold transition-all ${
              view === 'week'
                ? 'bg-[var(--brand)] text-white border-[var(--brand)]'
                : 'bg-white text-[var(--ink-muted)] border-[var(--line-soft)]'
            }`}
          >
            本週
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="flex-1 rounded-lg border border-[var(--line-soft)] bg-white px-3 py-2 text-sm font-bold text-[var(--ink-main)]"
          />
          <button
            onClick={() => setStatus(status === 'pending' ? 'all' : 'pending')}
            className="rounded-lg border border-[var(--line-soft)] bg-white px-3 py-2 text-xs font-black tracking-widest text-[var(--ink-muted)]"
          >
            {status === 'pending' ? '僅待處理' : '全部'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-28 space-y-3">
        {error && (
          <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            {error}
          </div>
        )}
        {loading && (
          <div className="rounded-xl border border-[var(--line-soft)] bg-white p-4 text-sm text-[var(--ink-muted)]">
            載入課務中...
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="rounded-xl border border-dashed border-[var(--line-soft)] bg-white p-8 text-center text-sm text-[var(--ink-muted)]">
            此範圍沒有課堂資料
          </div>
        )}

        {!loading &&
          items.map((item) => {
            const isDone = item.session?.record_status === SessionRecordStatus.DONE;
            return (
              <button
                key={toKey(item)}
                type="button"
                onClick={() => void openItem(item)}
                className={`w-full rounded-xl border bg-white p-4 text-left shadow-sm transition-all ${
                  isDone ? 'border-[#d3e2da]' : 'border-[var(--line-soft)]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-extrabold text-[var(--ink-main)]">{item.student?.name || '未知個案'}</div>
                    <div className="mt-1 text-xs font-mono text-[var(--ink-muted)]">
                      {item.date} {item.start_time}-{item.end_time}
                    </div>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${statusTone(item)}`}>
                    {statusLabel(item)}
                  </span>
                </div>
              </button>
            );
          })}
      </div>

      {(isDrawerOpen || (activeSession && activeItem)) && activeSession && activeItem && (
        <div className="fixed inset-0 z-[70] bg-black/35 md:bg-transparent md:pointer-events-none" onClick={() => void closeDrawer()}>
          <div
            className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-2xl bg-white md:pointer-events-auto md:inset-y-0 md:right-0 md:left-auto md:w-[440px] md:max-h-none md:rounded-none md:border-l md:border-[var(--line-soft)] md:shadow-[-12px_0_30px_rgba(0,0,0,0.08)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 border-b border-[var(--line-soft)] bg-white px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-extrabold text-[var(--ink-main)]">{activeItem.student?.name || '未知個案'}</div>
                  <div className="mt-1 text-xs font-mono text-[var(--ink-muted)]">
                    {activeItem.date} {activeItem.start_time}-{activeItem.end_time}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void closeDrawer()}
                  className="rounded-full p-1 text-[var(--ink-muted)] hover:bg-[var(--brand-soft)]"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
              {saveState !== 'idle' && (
                <div className="mt-2 text-[10px] font-black uppercase tracking-widest text-[var(--ink-muted)]">
                  {saveState === 'saving' && '自動儲存中'}
                  {saveState === 'saved' && '已儲存'}
                  {saveState === 'error' && '儲存失敗'}
                </div>
              )}
            </div>

            <div className="space-y-5 px-4 py-4">
              <div>
                <div className="mb-2 text-xs font-black uppercase tracking-widest text-slate-500">出勤</div>
                <div className="grid grid-cols-3 gap-2">
                  {attendanceButtons.map((button) => {
                    const active = activeSession.attendance === button.value;
                    return (
                      <button
                        key={button.value}
                        type="button"
                        onClick={() => void handleAttendanceClick(button.value)}
                        className={`rounded-lg border px-2 py-2 text-xs font-bold transition-all ${
                          active ? button.tone : 'bg-white text-[var(--ink-muted)] border-[var(--line-soft)]'
                        }`}
                      >
                        {button.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-[var(--ink-muted)]">
                  上課表現紀錄
                </label>
                <textarea
                  className="h-28 w-full rounded-xl border border-[var(--line-soft)] p-3 text-sm text-[var(--ink-main)]"
                  value={activeSession.performance_log || ''}
                  onChange={(event) => scheduleSave({ performance_log: event.target.value })}
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-[var(--ink-muted)]">
                  行政備註
                </label>
                <textarea
                  className="h-20 w-full rounded-xl border border-[var(--line-soft)] p-3 text-sm text-[var(--ink-main)]"
                  value={activeSession.note || ''}
                  onChange={(event) => scheduleSave({ note: event.target.value })}
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <label className="text-xs font-black uppercase tracking-widest text-[var(--ink-muted)]">PC 摘要</label>
                  <button
                    type="button"
                    onClick={() => void handleGenerateSummary()}
                    disabled={isGenerating}
                    className="rounded-lg border border-[#b9cdc5] px-2.5 py-1.5 text-[10px] font-black text-[var(--brand)] disabled:opacity-50"
                  >
                    {isGenerating ? '產生中...' : '一鍵摘要'}
                  </button>
                </div>
                <textarea
                  className="h-28 w-full rounded-xl border border-[#cfe0d9] bg-[#f3f8f6] p-3 text-sm text-[var(--ink-main)]"
                  value={activeSession.pc_summary || ''}
                  onChange={(event) => scheduleSave({ pc_summary: event.target.value })}
                />
              </div>
            </div>

            <div className="sticky bottom-0 grid grid-cols-2 gap-2 border-t border-[var(--line-soft)] bg-white p-4">
              <button
                type="button"
                onClick={() => void closeDrawer()}
                className="rounded-xl border border-[var(--line-soft)] px-3 py-3 text-sm font-bold text-[var(--ink-muted)]"
              >
                稍後處理
              </button>
              <button
                type="button"
                onClick={() => void handleComplete()}
                disabled={isCompleting}
                className="rounded-xl bg-[var(--brand)] px-3 py-3 text-sm font-black text-white disabled:opacity-60"
              >
                {isCompleting ? '完成中...' : '一鍵完成'}
              </button>
            </div>
          </div>
        </div>
      )}

      {!isDrawerOpen && !activeSession && (
        <div className="fixed bottom-20 md:bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] -translate-x-1/2 rounded-xl border border-[var(--line-soft)] bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--ink-muted)]">
              <CheckCircleIcon className="h-4 w-4 text-[var(--brand)]" />
              待處理 {pendingItems.length} 堂
            </div>
            <button
              type="button"
              onClick={() => {
                const next = nextPendingAfter(null);
                if (next) {
                  void openItem(next);
                  return;
                }
                toast('目前沒有待處理課堂。', 'success');
              }}
              className="rounded-lg border border-[var(--line-soft)] bg-[#f6f9f7] px-2.5 py-1.5 text-xs font-black text-[var(--ink-main)]"
            >
              快速開下一堂
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
