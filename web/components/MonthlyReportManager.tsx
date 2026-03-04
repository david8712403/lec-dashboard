'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type TouchEvent as ReactTouchEvent } from 'react';
import Link from 'next/link';
import { useReactToPrint } from 'react-to-print';
import { API_BASE_URL } from '@/hooks/useDashboardData';
import { useToast } from '@/components/Toast';
import {
  MONTHLY_REPORT_HEADER_IMAGE_PATH,
  MONTHLY_REPORT_SCHEDULE_TIME_COL_WIDTH_PX,
} from '@/constants/monthlyReport';

type SnapshotSession = {
  id: string;
  session_date?: string;
  start_time?: string;
  end_time?: string;
  student_name?: string;
  student_id?: string;
};

type SnapshotScheduleSlot = {
  id: string;
  student_id: string;
  student_name?: string;
  weekday: number;
  start_time: string;
  end_time: string;
};

type SnapshotRoster = {
  no: number;
  student_id: string;
  student_name: string;
  admission_date: string;
  course_type: string;
  sessions_count: number;
  monthly_fee: number;
  actual_paid: number;
  payment_method?: string;
};

type SnapshotYearEval = {
  month_ref: string;
  monthly_amount: number;
  students_count: number;
  stars_average: number;
  success_cases: number;
  leave_count: number;
  absences: number;
};

type MonthlyReport = {
  id: string;
  month_ref: string;
  title: string;
  content_page1: string;
  content_page2: string;
  content_page3: string;
  sync_status: string;
  source_snapshot?: {
    schedule_time_slots?: string[];
    schedule_slots?: SnapshotScheduleSlot[];
    sessions?: SnapshotSession[];
    roster_students?: SnapshotRoster[];
    year_evaluation?: SnapshotYearEval[];
  };
};

type ScheduleRow = {
  time: string;
  mon: string;
  tue: string;
  wed: string;
  thu: string;
  fri: string;
  sat: string;
};

type RosterRow = {
  no: string;
  student_name: string;
  admission_date: string;
  course_type: string;
  sessions_count: string;
  monthly_fee: string;
  payment_method: string;
  actual_paid: string;
};

type EvalRow = {
  month: string;
  monthly_amount: string;
  students_count: string;
  stars: string;
  success_cases: string;
  leave_count: string;
  absences: string;
};

type Draft = {
  teacher_name: string;
  schedule_rows: ScheduleRow[];
  roster_rows: RosterRow[];
  roster_col_widths: number[];
  eval_rows: EvalRow[];
};

const rosterNumericFields: Array<keyof RosterRow> = ['no', 'sessions_count', 'monthly_fee', 'actual_paid'];
const evalNumericFields: Array<keyof EvalRow> = [
  'monthly_amount',
  'students_count',
  'stars',
  'success_cases',
  'leave_count',
  'absences',
];

const scheduleColumns = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const rosterColumns = ['no', 'student_name', 'admission_date', 'course_type', 'sessions_count', 'monthly_fee', 'payment_method', 'actual_paid'] as const;
const rosterHeaders = ['編號', '學生姓名', '入室日期', '上課班別', '堂數', '每月學費', '付款方式', '實收費用'] as const;
const evalColumns = ['month', 'monthly_amount', 'students_count', 'stars', 'success_cases', 'leave_count', 'absences'] as const;
const evalHeaders = ['月份', '每月學費金額', '學生人數', '星星數統計', '成功案例', '離室人數', '出缺勤狀況（請假）'] as const;
const legacyRosterColWidths = [72, 150, 160, 100, 88, 120, 110, 120];
const defaultRosterColWidths = [72, 128, 182, 100, 88, 120, 110, 120];
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
const GLOBAL_TEACHER_KEY = 'lec.monthly_report.global_teacher_name';

const fetchWithAuth = (input: RequestInfo | URL, init?: RequestInit) =>
  fetch(input, { ...init, credentials: 'include' });

const getCurrentMonthRef = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const shiftMonthRef = (monthRef: string, delta: number) => {
  const [yearText, monthText] = monthRef.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  if (Number.isNaN(year) || Number.isNaN(month)) return monthRef;
  const base = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, '0')}`;
};

const formatRocDate = (isoDate?: string) => {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  const rocYear = date.getUTCFullYear() - 1911;
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${rocYear} 年 ${month} 月 ${day} 日`;
};

const normalizeRocDateText = (value: string) => {
  const match = value.trim().match(/^(\d+)\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日$/);
  if (!match) return value;
  const [, year, month, day] = match;
  return `${year} 年 ${month.padStart(2, '0')} 月 ${day.padStart(2, '0')} 日`;
};

const sortRosterRowsByStudentName = (rows: RosterRow[]) =>
  rows
    .slice()
    .sort((a, b) => {
      const byName = (a.student_name || '').trim().localeCompare((b.student_name || '').trim(), 'zh-Hant', {
        numeric: true,
        sensitivity: 'base',
      });
      if (byName !== 0) return byName;
      return String(a.no || '').localeCompare(String(b.no || ''), 'zh-Hant', { numeric: true });
    })
    .map((row, index) => ({
      ...row,
      no: String(index + 1),
    }));

const formatMonthRefHeading = (monthRef?: string) => {
  if (!monthRef) return '';
  const [year, month] = monthRef.split('-');
  if (!year || !month) return monthRef;
  return `${year}年${month}月`;
};

const parseJson = <T,>(value?: string, fallback?: T): T | undefined => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const timeToMin = (slot: string) => {
  const [start] = slot.split('-');
  const [h, m] = start.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return Number.MAX_SAFE_INTEGER;
  return h * 60 + m;
};

const buildDraftFromSnapshot = (report: MonthlyReport): Draft => {
  const snapshot = report.source_snapshot ?? {};
  const currentMonthRef = report.month_ref;
  const slotRows = snapshot.schedule_slots ?? [];
  const fallbackTimeSlotsFromSlots = slotRows.map(
    (slot) => `${slot.start_time}-${slot.end_time || slot.start_time}`,
  );
  const timeSlots = Array.from(
    new Set([...(snapshot.schedule_time_slots ?? []), ...fallbackTimeSlotsFromSlots].filter(Boolean)),
  ).sort((a, b) => timeToMin(a) - timeToMin(b));
  const sessions = snapshot.sessions ?? [];

  const rows: ScheduleRow[] = timeSlots.map((slot) => ({
    time: slot,
    mon: '',
    tue: '',
    wed: '',
    thu: '',
    fri: '',
    sat: '',
  }));

  const rowMap = new Map(rows.map((row) => [row.time, row]));

  for (const slot of slotRows) {
    const timeKey = `${slot.start_time}-${slot.end_time || slot.start_time}`;
    const row = rowMap.get(timeKey);
    if (!row) continue;
    const col =
      slot.weekday === 1
        ? 'mon'
        : slot.weekday === 2
          ? 'tue'
          : slot.weekday === 3
            ? 'wed'
            : slot.weekday === 4
              ? 'thu'
              : slot.weekday === 5
                ? 'fri'
                : slot.weekday === 6
                  ? 'sat'
                  : null;
    if (!col) continue;
    const previous = row[col as keyof ScheduleRow] as string;
    const name = slot.student_name || '';
    if (!name) continue;
    const lines = previous ? previous.split('\n').filter(Boolean) : [];
    if (!lines.includes(name)) {
      lines.push(name);
    }
    row[col as keyof ScheduleRow] = lines.join('\n');
  }

  if (slotRows.length === 0) {
    for (const session of sessions) {
      const slot = `${session.start_time || ''}-${session.end_time || session.start_time || ''}`;
      const row = rowMap.get(slot);
      if (!row) continue;
      const date = session.session_date ? new Date(session.session_date) : null;
      if (!date || Number.isNaN(date.getTime())) continue;
      const weekday = date.getDay();
      const col = weekday === 1 ? 'mon' : weekday === 2 ? 'tue' : weekday === 3 ? 'wed' : weekday === 4 ? 'thu' : weekday === 5 ? 'fri' : weekday === 6 ? 'sat' : null;
      if (!col) continue;
      const previous = row[col as keyof ScheduleRow] as string;
      const name = session.student_name || '';
      const lines = previous ? previous.split('\n').filter(Boolean) : [];
      if (!lines.includes(name)) {
        lines.push(name);
      }
      row[col as keyof ScheduleRow] = lines.join('\n');
    }
  }

  const roster_rows: RosterRow[] = sortRosterRowsByStudentName(
    (snapshot.roster_students ?? []).map((item) => ({
      no: String(item.no),
      student_name: item.student_name || '',
      admission_date: formatRocDate(item.admission_date),
      course_type: item.course_type || '',
      sessions_count: String(item.sessions_count ?? 0),
      monthly_fee: String(item.monthly_fee ?? 0),
      payment_method: item.payment_method || '',
      actual_paid: '',
    })),
  );

  const previousMonthRef = shiftMonthRef(currentMonthRef, -1);
  const previousMonthStars = (snapshot.year_evaluation ?? []).find(
    (item) => item.month_ref === previousMonthRef,
  )?.stars_average;

  const eval_rows: EvalRow[] = (snapshot.year_evaluation ?? []).map((item) => {
    const isFutureMonth = item.month_ref > currentMonthRef;
    const isCurrentMonth = item.month_ref === currentMonthRef;
    return {
      month: item.month_ref,
      monthly_amount: isFutureMonth ? '' : String(item.monthly_amount ?? 0),
      students_count: isFutureMonth ? '' : String(item.students_count ?? 0),
      stars: isFutureMonth
        ? ''
        : isCurrentMonth
          ? String(previousMonthStars ?? 0)
          : String(item.stars_average ?? 0),
      success_cases: '',
      leave_count: '',
      absences: '',
    };
  });

  return {
    teacher_name: '',
    schedule_rows: rows,
    roster_rows,
    roster_col_widths: [...defaultRosterColWidths],
    eval_rows,
  };
};

const buildDraftFromStored = (report: MonthlyReport): Draft => {
  const p1 = parseJson<{ teacher_name?: string; schedule_rows?: ScheduleRow[] }>(report.content_page1, {});
  const p2 = parseJson<{ roster_rows?: RosterRow[]; roster_col_widths?: number[] }>(report.content_page2, {});
  const p3 = parseJson<{ eval_rows?: EvalRow[] }>(report.content_page3, {});
  const base = buildDraftFromSnapshot(report);
  const normalizedRosterColWidths =
    p2?.roster_col_widths?.length === defaultRosterColWidths.length
      ? p2.roster_col_widths.map((value, index) =>
          Number.isFinite(value) && value >= 60 ? value : defaultRosterColWidths[index],
        )
      : base.roster_col_widths;
  const isLegacyDefaultWidthSet = normalizedRosterColWidths.every(
    (value, index) => Math.abs(value - legacyRosterColWidths[index]) < 0.001,
  );

  const rosterRowsFromStored = p2?.roster_rows?.length
    ? p2.roster_rows.map((row) => ({
        ...row,
        admission_date: normalizeRocDateText(row.admission_date || ''),
      }))
    : base.roster_rows;

  return {
    teacher_name: p1?.teacher_name ?? base.teacher_name,
    schedule_rows: p1?.schedule_rows?.length ? p1.schedule_rows : base.schedule_rows,
    roster_rows: sortRosterRowsByStudentName(rosterRowsFromStored),
    roster_col_widths: isLegacyDefaultWidthSet ? [...defaultRosterColWidths] : normalizedRosterColWidths,
    eval_rows: p3?.eval_rows?.length ? p3.eval_rows : base.eval_rows,
  };
};

const serializeDraft = (draft: Draft) =>
  JSON.stringify({
    teacher_name: draft.teacher_name,
    schedule_rows: draft.schedule_rows,
    roster_rows: draft.roster_rows,
    roster_col_widths: draft.roster_col_widths,
    eval_rows: draft.eval_rows,
  });

const clampZoomPercent = (value: number) => Math.max(30, Math.min(160, Math.round(value)));

type TouchPointList = { length: number; [index: number]: { clientX: number; clientY: number } };

const getTouchDistance = (touches: TouchPointList) => {
  if (touches.length < 2) return 0;
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
};

export function MonthlyReportManager() {
  const { toast } = useToast();
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<MonthlyReport | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [activeMonthRef, setActiveMonthRef] = useState(getCurrentMonthRef());
  const [activePage, setActivePage] = useState<1 | 2 | 3>(1);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [globalTeacherName, setGlobalTeacherName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const resizeRef = useRef<{ colIndex: number; startX: number; startWidth: number } | null>(null);
  const autoSaveTimerRef = useRef<number | null>(null);
  const lastSavedDraftRef = useRef('');
  const previewViewportRef = useRef<HTMLDivElement | null>(null);
  const printPagesRef = useRef<HTMLDivElement | null>(null);
  const zoomInitializedRef = useRef(false);
  const pinchStateRef = useRef<{ startDistance: number; startZoom: number } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(GLOBAL_TEACHER_KEY);
    if (saved) {
      setGlobalTeacherName(saved);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(GLOBAL_TEACHER_KEY, globalTeacherName);
  }, [globalTeacherName]);

  useEffect(() => {
    if (!draft) return;
    const teacherName = globalTeacherName.trim();
    if (!teacherName) return;
    setDraft((prev) => {
      if (!prev) return prev;
      if (prev.teacher_name === teacherName) return prev;
      return { ...prev, teacher_name: teacherName };
    });
  }, [draft, globalTeacherName]);

  useEffect(() => {
    if (zoomInitializedRef.current) return;
    if (!draft) return;
    const viewport = previewViewportRef.current;
    if (!viewport) return;
    const availableWidth = Math.max(0, viewport.clientWidth - 24);
    if (availableWidth <= 0) return;
    const fitZoom = Math.floor((availableWidth / A4_WIDTH_PX) * 100);
    const clampedZoom = clampZoomPercent(fitZoom);
    setZoomPercent(clampedZoom);
    zoomInitializedRef.current = true;
  }, [draft]);

  const handlePreviewTouchStart = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      if (event.touches.length !== 2) return;
      const distance = getTouchDistance(event.touches);
      if (!distance) return;
      pinchStateRef.current = {
        startDistance: distance,
        startZoom: zoomPercent,
      };
    },
    [zoomPercent],
  );

  const handlePreviewTouchMove = useCallback((event: ReactTouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2) return;
    const state = pinchStateRef.current;
    if (!state) return;
    const currentDistance = getTouchDistance(event.touches);
    if (!currentDistance || !state.startDistance) return;
    event.preventDefault();
    const nextZoom = clampZoomPercent((state.startZoom * currentDistance) / state.startDistance);
    setZoomPercent(nextZoom);
  }, []);

  const handlePreviewTouchEnd = useCallback((event: ReactTouchEvent<HTMLDivElement>) => {
    if (event.touches.length < 2) {
      pinchStateRef.current = null;
    }
  }, []);

  useEffect(() => {
    const viewport = previewViewportRef.current;
    if (!viewport) return;
    const preventNativePinch = (event: TouchEvent) => {
      if (event.touches.length >= 2) {
        event.preventDefault();
      }
    };
    viewport.addEventListener('touchmove', preventNativePinch, { passive: false });
    return () => {
      viewport.removeEventListener('touchmove', preventNativePinch);
    };
  }, [selectedReport?.id]);

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/monthly-reports`);
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const list = (await response.json()) as MonthlyReport[];
      setReports(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error(error);
      toast('讀取月報失敗', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const loadReportById = useCallback(async (id: string) => {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/monthly-reports/${id}`);
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = (await response.json()) as MonthlyReport;
      const nextDraft = buildDraftFromStored(data);
      setSelectedReport(data);
      setDraft(nextDraft);
      lastSavedDraftRef.current = serializeDraft(nextDraft);
    } catch (error) {
      console.error(error);
      toast('讀取月報內容失敗', 'error');
    }
  }, [toast]);

  useEffect(() => {
    if (!reports.length) {
      setSelectedReport(null);
      setDraft(null);
      return;
    }
    const target = reports.find((report) => report.month_ref === activeMonthRef);
    if (!target) {
      setSelectedReport(null);
      setDraft(null);
      lastSavedDraftRef.current = '';
      return;
    }
    if (selectedReport?.id === target.id) return;
    void loadReportById(target.id);
  }, [reports, activeMonthRef, selectedReport?.id, loadReportById]);

  const handleSync = async () => {
    const monthRef = activeMonthRef || getCurrentMonthRef();
    setIsSyncing(true);
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/monthly-reports/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month_ref: monthRef, reset_content: true }),
      });
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const report = (await response.json()) as MonthlyReport;
      const nextDraft = buildDraftFromSnapshot(report);
      setActiveMonthRef(monthRef);
      setSelectedReport(report);
      setDraft(nextDraft);
      lastSavedDraftRef.current = serializeDraft(nextDraft);
      await loadReports();
      toast('月報同步完成', 'success');
    } catch (error) {
      console.error(error);
      toast('同步失敗', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (!selectedReport || !draft) return;
    const nextSerialized = serializeDraft(draft);
    if (nextSerialized === lastSavedDraftRef.current) return;

    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = window.setTimeout(async () => {
      setIsSaving(true);
      try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/monthly-reports/${selectedReport.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `${selectedReport.month_ref} 月報（教師別）`,
            content_page1: JSON.stringify({ teacher_name: draft.teacher_name, schedule_rows: draft.schedule_rows }),
            content_page2: JSON.stringify({
              roster_rows: draft.roster_rows,
              roster_col_widths: draft.roster_col_widths,
            }),
            content_page3: JSON.stringify({ eval_rows: draft.eval_rows }),
            sync_status: '已手動編輯',
          }),
        });
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const updated = (await response.json()) as MonthlyReport;
        lastSavedDraftRef.current = nextSerialized;
        setSelectedReport(updated);
        setReports((prev) => prev.map((report) => (report.id === updated.id ? updated : report)));
      } catch (error) {
        console.error(error);
        toast('自動儲存失敗', 'error');
      } finally {
        setIsSaving(false);
      }
    }, 900);

    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [selectedReport?.id, draft, toast]);

  const updateScheduleCell = (index: number, key: keyof Omit<ScheduleRow, 'time'>, value: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = [...prev.schedule_rows];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, schedule_rows: next };
    });
  };

  const updateRosterCell = (index: number, key: keyof RosterRow, value: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = [...prev.roster_rows];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, roster_rows: next };
    });
  };

  const updateEvalCell = (index: number, key: keyof EvalRow, value: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = [...prev.eval_rows];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, eval_rows: next };
    });
  };

  const handleColumnResizeMove = useCallback((event: MouseEvent) => {
    const current = resizeRef.current;
    if (!current) return;
    const delta = event.clientX - current.startX;
    const nextWidth = Math.max(60, current.startWidth + delta);
    setDraft((prev) => {
      if (!prev) return prev;
      const widths = [...prev.roster_col_widths];
      widths[current.colIndex] = nextWidth;
      return { ...prev, roster_col_widths: widths };
    });
  }, []);

  const stopColumnResize = useCallback(() => {
    resizeRef.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    window.removeEventListener('mousemove', handleColumnResizeMove);
  }, [handleColumnResizeMove]);

  const startColumnResize = useCallback(
    (colIndex: number, event: ReactMouseEvent<HTMLDivElement>) => {
      if (!draft) return;
      event.preventDefault();
      event.stopPropagation();
      resizeRef.current = {
        colIndex,
        startX: event.clientX,
        startWidth: draft.roster_col_widths[colIndex] ?? defaultRosterColWidths[colIndex],
      };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', handleColumnResizeMove);
      window.addEventListener('mouseup', stopColumnResize, { once: true });
    },
    [draft, handleColumnResizeMove, stopColumnResize],
  );

  useEffect(() => {
    return () => {
      stopColumnResize();
    };
  }, [stopColumnResize]);

  const handleExportPdf = useReactToPrint({
    contentRef: printPagesRef,
    documentTitle: `${selectedReport?.month_ref || activeMonthRef}-月報`,
    pageStyle: `
      @page {
        size: A4 portrait;
        margin: 0;
      }
      @media print {
        html, body {
          background: #ffffff !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `,
    onBeforePrint: async () => {
      setIsExporting(true);
    },
    onAfterPrint: () => {
      setIsExporting(false);
    },
    onPrintError: (_location, error) => {
      setIsExporting(false);
      toast(`匯出失敗：${error.message}`, 'error');
    },
  });

  const selectedMonthHeading = formatMonthRefHeading(activeMonthRef);
  const activeMonthReport = useMemo(
    () => reports.find((report) => report.month_ref === activeMonthRef) ?? null,
    [reports, activeMonthRef],
  );
  const activeMonthStatusLabel = !activeMonthReport
    ? '無資料'
    : /手動|編輯/.test(activeMonthReport.sync_status || '')
      ? '已編輯儲存'
      : '已同步';
  const activeMonthStatusTone =
    activeMonthStatusLabel === '無資料'
      ? 'bg-[#f4f7f5] text-[#5b6c66]'
      : activeMonthStatusLabel === '已同步'
        ? 'bg-[#e6f1ec] text-[#2f6a5b]'
        : 'bg-[#fff3e8] text-[#8b5a2b]';
  const monthlyFeeTotal = useMemo(
    () =>
      (draft?.roster_rows ?? []).reduce((sum, row) => {
        const value = Number(String(row.monthly_fee).replace(/,/g, '').trim());
        return sum + (Number.isNaN(value) ? 0 : value);
      }, 0),
    [draft?.roster_rows],
  );
  const monthHeading = selectedReport ? formatMonthRefHeading(selectedReport.month_ref) : selectedMonthHeading;
  const teacherDisplayName = draft?.teacher_name || globalTeacherName || '未設定';

  const renderSchedulePage = (editable: boolean, printMode = false, pageBreakClass = '') => {
    if (!draft) return null;
    const pageClasses = `w-[210mm] h-[297mm] box-border overflow-hidden rounded-xl border border-[#c5d0ca] bg-white p-[14mm] ${printMode ? 'print:rounded-none print:border-0 print:break-inside-avoid-page' : ''} ${pageBreakClass}`;
    return (
      <article className={pageClasses}>
        <div className="mb-3 h-[18mm] w-full overflow-hidden rounded-sm bg-white">
          <img
            src={MONTHLY_REPORT_HEADER_IMAGE_PATH}
            alt="月報頁首"
            className="h-full w-full object-contain object-center"
          />
        </div>
        <div className="text-center text-xl font-black tracking-[0.08em] text-[#1f312a]">中華學習障礙協會</div>
        <div className="text-center text-sm font-bold text-[#385148] mb-3">{monthHeading}課表（教師別）</div>
        <div className="mb-3">
          <label className="text-sm text-[#4a6159] mr-0">教師：</label>
          <span className="inline-flex px-0 py-1 text-sm font-bold text-[#1f312a] min-w-[180px]">
            {teacherDisplayName}
          </span>
        </div>
        <table className="w-full table-fixed border-collapse text-sm">
          <colgroup>
            <col style={{ width: `${MONTHLY_REPORT_SCHEDULE_TIME_COL_WIDTH_PX}px` }} />
            {scheduleColumns.map((col) => (
              <col key={`schedule-col-${col}`} />
            ))}
          </colgroup>
          <thead>
            <tr className="bg-[#eef3f1]">
              <th className="border-2 border-[#62756d] p-2 whitespace-nowrap">時段</th>
              <th className="border-2 border-[#62756d] p-2">一</th>
              <th className="border-2 border-[#62756d] p-2">二</th>
              <th className="border-2 border-[#62756d] p-2">三</th>
              <th className="border-2 border-[#62756d] p-2">四</th>
              <th className="border-2 border-[#62756d] p-2">五</th>
              <th className="border-2 border-[#62756d] p-2">六</th>
            </tr>
          </thead>
          <tbody>
            {draft.schedule_rows.map((row, idx) => (
              <tr key={`${row.time}-${idx}`}>
                <td className="border-2 border-[#62756d] p-2 text-center font-bold align-middle whitespace-nowrap">{row.time}</td>
                {scheduleColumns.map((col) => (
                  <td key={col} className="border-2 border-[#62756d] p-1 align-middle">
                    {editable ? (
                      <textarea
                        value={row[col]}
                        onChange={(e) => updateScheduleCell(idx, col, e.target.value)}
                        wrap="off"
                        className="w-full min-h-[104px] resize-none border-0 bg-transparent p-1 leading-6 whitespace-pre overflow-x-auto overflow-y-auto focus:outline-none"
                      />
                    ) : (
                      <div className="w-full min-h-[104px] border-0 bg-transparent p-1 leading-6 whitespace-pre overflow-hidden">
                        {row[col] || '\u00a0'}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    );
  };

  const renderRosterPage = (editable: boolean, printMode = false, pageBreakClass = '') => {
    if (!draft) return null;
    const pageClasses = `w-[210mm] h-[297mm] box-border overflow-hidden rounded-xl border border-[#c5d0ca] bg-white p-[14mm] ${printMode ? 'print:rounded-none print:border-0 print:break-inside-avoid-page' : ''} ${pageBreakClass}`;
    return (
      <article className={pageClasses}>
        <div className="mb-3 h-[18mm] w-full overflow-hidden rounded-sm bg-white">
          <img
            src={MONTHLY_REPORT_HEADER_IMAGE_PATH}
            alt="月報頁首"
            className="h-full w-full object-contain object-center"
          />
        </div>
        <div className="text-center text-xl font-black tracking-[0.08em] text-[#1f312a] mb-3">教師授課學生名單（教師別）</div>
        <table className="w-full border-collapse text-sm">
          <colgroup>
            {draft.roster_col_widths.map((width, index) => (
              <col key={`roster-col-${index}`} style={{ width: `${width}px` }} />
            ))}
          </colgroup>
          <thead>
            <tr className="bg-[#eef3f1]">
              {rosterHeaders.map((label, colIndex) => (
                <th key={label} className="border-2 border-[#62756d] p-2 align-middle relative">
                  <span>{label}</span>
                  {editable && (
                    <div
                      onMouseDown={(event) => startColumnResize(colIndex, event)}
                      className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-[#2f6a5b33]"
                      title="拖曳調整欄寬"
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {draft.roster_rows.map((row, idx) => (
              <tr key={`roster-${idx}`} className="h-12">
                {rosterColumns.map((col) => (
                  <td key={col} className="border-2 border-[#62756d] px-2 py-1 align-middle">
                    {editable ? (
                      <input
                        value={row[col]}
                        onChange={(e) => updateRosterCell(idx, col, e.target.value)}
                        className={`block h-8 w-full align-middle border-0 bg-transparent px-1 py-0 text-sm leading-8 whitespace-nowrap overflow-x-auto focus:outline-none ${rosterNumericFields.includes(col) ? 'text-right' : ''}`}
                      />
                    ) : (
                      <div
                        className={`block h-8 w-full align-middle border-0 bg-transparent px-1 py-0 text-sm leading-8 whitespace-nowrap overflow-hidden ${rosterNumericFields.includes(col) ? 'text-right' : ''}`}
                      >
                        {row[col] || '\u00a0'}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="bg-[#f8fbf9]">
              <td className="border-2 border-[#62756d] p-2 text-right font-bold" colSpan={5}>
                每月學費合計
              </td>
              <td className="border-2 border-[#62756d] p-2 font-bold text-right">{monthlyFeeTotal}</td>
              <td className="border-2 border-[#62756d] p-2" />
              <td className="border-2 border-[#62756d] p-2" />
            </tr>
          </tbody>
        </table>
      </article>
    );
  };

  const renderEvalPage = (editable: boolean, printMode = false, pageBreakClass = '') => {
    if (!draft) return null;
    const pageClasses = `w-[210mm] h-[297mm] box-border overflow-hidden rounded-xl border border-[#c5d0ca] bg-white p-[14mm] ${printMode ? 'print:rounded-none print:border-0 print:break-inside-avoid-page' : ''} ${pageBreakClass}`;
    return (
      <article className={pageClasses}>
        <div className="mb-3 h-[18mm] w-full overflow-hidden rounded-sm bg-white">
          <img
            src={MONTHLY_REPORT_HEADER_IMAGE_PATH}
            alt="月報頁首"
            className="h-full w-full object-contain object-center"
          />
        </div>
        <div className="text-center text-xl font-black tracking-[0.08em] text-[#1f312a] mb-3">教師評核統計表（教師別）</div>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[#eef3f1]">
              {evalHeaders.map((label) => (
                <th key={label} className="border-2 border-[#62756d] p-2 align-middle">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {draft.eval_rows.map((row, idx) => (
              <tr key={`eval-${idx}`} className="h-12">
                {evalColumns.map((col) => (
                  <td key={col} className="border-2 border-[#62756d] px-2 py-1 align-middle">
                    {editable ? (
                      <input
                        value={row[col]}
                        onChange={(e) => updateEvalCell(idx, col, e.target.value)}
                        className={`block h-8 w-full align-middle border-0 bg-transparent px-1 py-0 text-sm leading-8 whitespace-nowrap overflow-x-auto focus:outline-none ${evalNumericFields.includes(col) ? 'text-right' : ''}`}
                      />
                    ) : (
                      <div
                        className={`block h-8 w-full align-middle border-0 bg-transparent px-1 py-0 text-sm leading-8 whitespace-nowrap overflow-hidden ${evalNumericFields.includes(col) ? 'text-right' : ''}`}
                      >
                        {row[col] || '\u00a0'}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    );
  };

  const renderReportPage = (page: 1 | 2 | 3, editable: boolean, printMode = false) => {
    const pageBreakClass = printMode && page !== 3 ? 'print:break-after-page' : 'print:break-after-auto';
    if (page === 1) return renderSchedulePage(editable, printMode, pageBreakClass);
    if (page === 2) return renderRosterPage(editable, printMode, pageBreakClass);
    return renderEvalPage(editable, printMode, pageBreakClass);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="rounded-2xl border border-[#c9d4ce] bg-[linear-gradient(120deg,#f4f8f6,#eef4f0)] p-4 md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-[#4a6159] mt-1">課表時段使用資料庫歷史時段，名單含入室日期與最新班別，評核含年度 12 月</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <input
              value={globalTeacherName}
              onChange={(e) => setGlobalTeacherName(e.target.value)}
              placeholder="全域教師名稱"
              className="w-44 rounded-lg border border-[#b8c8bf] bg-white px-3 py-2 text-sm"
            />
            <Link href="/schedule" className="rounded-lg border border-[#b8c8bf] bg-white px-3 py-2 text-sm font-bold text-[#2f6a5b]">
              週課表編輯
            </Link>
            <button onClick={handleSync} disabled={isSyncing} className="rounded-lg bg-[#2f6a5b] px-3 py-2 text-sm font-bold text-white disabled:opacity-60">{isSyncing ? '同步中...' : '同步資料'}</button>
            <button onClick={handleExportPdf} disabled={isExporting || !selectedReport || !draft} className="rounded-lg border border-[#b8c8bf] bg-[#e7f1ec] px-3 py-2 text-sm font-bold text-[#2f6a5b] disabled:opacity-60">{isExporting ? '匯出中...' : '匯出 PDF'}</button>
          </div>
        </div>
        <div className="mt-4 border-t border-[#c7d4ce] pt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveMonthRef((prev) => shiftMonthRef(prev, -1))}
              className="rounded-lg border border-[#b8c8bf] bg-white px-3 py-2 text-sm font-bold text-[#2f6a5b]"
            >
              ← 上個月
            </button>
            <input
              type="month"
              value={activeMonthRef}
              onChange={(e) => setActiveMonthRef(e.target.value)}
              className="w-44 rounded-lg border border-[#b8c8bf] bg-white px-3 py-2 text-sm font-bold text-[#1f312a]"
              title="選擇月份（可切換到尚未建立的月報）"
            />
            <button
              type="button"
              onClick={() => setActiveMonthRef((prev) => shiftMonthRef(prev, 1))}
              className="rounded-lg border border-[#b8c8bf] bg-white px-3 py-2 text-sm font-bold text-[#2f6a5b]"
            >
              下個月 →
            </button>
            <div className={`rounded-lg px-3 py-2 text-sm font-bold ${activeMonthStatusTone}`}>
              {activeMonthStatusLabel}
            </div>
            {isSaving && <div className="text-sm font-bold text-[#2f6a5b]">自動儲存中…</div>}
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map((n) => (
              <button key={n} type="button" onClick={() => setActivePage(n as 1 | 2 | 3)} className={`rounded-lg px-4 py-2 text-sm font-bold ${activePage === n ? 'bg-[#2f6a5b] text-white' : 'bg-[#edf4f0] text-[#3f5a50]'}`}>第 {n} 頁</button>
            ))}
          </div>
        </div>
        <div className="mt-3 hidden md:flex items-center gap-3">
          <label className="text-sm font-bold text-[#486158]">縮放</label>
          <input
            type="range"
            min={30}
            max={160}
            step={5}
            value={zoomPercent}
            onChange={(e) => setZoomPercent(Number(e.target.value))}
            className="w-44"
          />
          <span className="text-sm font-bold text-[#2f6a5b]">{zoomPercent}%</span>
        </div>
      </div>

      <section className="space-y-4">
          {!selectedReport || !draft ? (
            <div className="rounded-2xl border border-dashed border-[#c8d4cd] bg-white p-10 text-center text-[#5b6c66]">
              <div className="font-bold text-[#2f6a5b]">{activeMonthRef} 尚未建立月報</div>
              <div className="mt-2">請點上方「同步資料」建立該月份月報。</div>
            </div>
          ) : (
            <>
              <div
                ref={previewViewportRef}
                className="overflow-auto rounded-xl border border-[#c5d0ca] bg-[#f4f7f5] p-3"
                style={{ touchAction: 'pan-x pan-y' }}
                onTouchStart={handlePreviewTouchStart}
                onTouchMove={handlePreviewTouchMove}
                onTouchEnd={handlePreviewTouchEnd}
                onTouchCancel={handlePreviewTouchEnd}
              >
                <div
                  className="origin-top-left"
                  style={{
                    width: `${A4_WIDTH_PX}px`,
                    minWidth: `${A4_WIDTH_PX}px`,
                    transform: `scale(${zoomPercent / 100})`,
                    height: `${Math.round((A4_HEIGHT_PX + 16) * (zoomPercent / 100))}px`,
                  }}
                >
                  {renderReportPage(activePage, true)}
                </div>
              </div>
              <div ref={printPagesRef} className="hidden print:block">
                <div className="space-y-4 print:space-y-0">
                  {renderReportPage(1, false, true)}
                  {renderReportPage(2, false, true)}
                  {renderReportPage(3, false, true)}
                </div>
              </div>
            </>
          )}
      </section>
      {isExporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1f312a]/30 backdrop-blur-[1px]">
          <div className="flex items-center gap-3 rounded-xl border border-[#c6d3cc] bg-white px-4 py-3 shadow-sm">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#2f6a5b] border-t-transparent" />
            <span className="text-sm font-bold text-[#2f6a5b]">PDF 匯出中，請稍候...</span>
          </div>
        </div>
      )}
    </div>
  );
}
