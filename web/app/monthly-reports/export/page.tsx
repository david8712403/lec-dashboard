'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { API_BASE_URL } from '@/hooks/useDashboardData';
import {
  MONTHLY_REPORT_EVAL_COL_WIDTHS_PX,
  MONTHLY_REPORT_HEADER_IMAGE_PATH,
  MONTHLY_REPORT_SCHEDULE_TIME_COL_WIDTH_PX,
} from '@/constants/monthlyReport';

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

type ExportPayload = {
  token: string;
  report_id: string;
  month_ref: string;
  draft: Draft;
  global_teacher_name?: string;
  created_at: number;
};

type MonthlyReportResponse = {
  id: string;
  month_ref: string;
  content_page1: string;
  content_page2: string;
  content_page3: string;
};

const EXPORT_DRAFT_STORAGE_KEY_PREFIX = 'lec.monthly_report.export_draft.';
const defaultRosterColWidths = [72, 128, 182, 100, 88, 120, 110, 120];
const scheduleColumns = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const rosterColumns = ['no', 'student_name', 'admission_date', 'course_type', 'sessions_count', 'monthly_fee', 'payment_method', 'actual_paid'] as const;
const rosterHeaders = ['編號', '學生姓名', '入室日期', '上課班別', '堂數', '每月學費', '付款方式', '實收費用'] as const;
const evalColumns = ['month', 'monthly_amount', 'students_count', 'stars', 'success_cases', 'leave_count', 'absences'] as const;
const evalHeaders = ['月份', '每月學費金額', '學生人數', '星星數統計', '成功案例', '離室人數', '出缺勤狀況（請假）'] as const;
const rosterNumericFields: Array<keyof RosterRow> = ['no', 'sessions_count', 'monthly_fee', 'actual_paid'];
const evalNumericFields: Array<keyof EvalRow> = ['monthly_amount', 'students_count', 'stars', 'success_cases', 'leave_count', 'absences'];

const parseJson = <T,>(value?: string, fallback?: T): T | undefined => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const formatMonthRefHeading = (monthRef?: string) => {
  if (!monthRef) return '';
  const [year, month] = monthRef.split('-');
  if (!year || !month) return monthRef;
  return `${year}年${month}月`;
};

const shiftMonthRef = (monthRef: string, delta: number) => {
  const [yearText, monthText] = monthRef.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  if (Number.isNaN(year) || Number.isNaN(month)) return monthRef;
  const base = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, '0')}`;
};

const getEvalRowsForExport = (rows: EvalRow[], targetMonthRef: string) => {
  if (!targetMonthRef) return rows;
  const previousMonthRef = shiftMonthRef(targetMonthRef, -1);
  const previousMonthStars = rows.find((row) => row.month === previousMonthRef)?.stars?.trim() || '';
  const exportStars = previousMonthStars || '0';
  return rows.map((row) =>
    row.month === targetMonthRef
      ? {
          ...row,
          stars: exportStars,
          success_cases: '0',
          leave_count: '0',
        }
      : row,
  );
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

const buildDraftFromStoredContent = (report: MonthlyReportResponse): Draft => {
  const p1 = parseJson<{ teacher_name?: string; schedule_rows?: ScheduleRow[] }>(report.content_page1, {});
  const p2 = parseJson<{ roster_rows?: RosterRow[]; roster_col_widths?: number[] }>(report.content_page2, {});
  const p3 = parseJson<{ eval_rows?: EvalRow[] }>(report.content_page3, {});
  return {
    teacher_name: p1?.teacher_name ?? '',
    schedule_rows: p1?.schedule_rows ?? [],
    roster_rows: sortRosterRowsByStudentName(p2?.roster_rows ?? []),
    roster_col_widths:
      p2?.roster_col_widths?.length === defaultRosterColWidths.length
        ? p2.roster_col_widths.map((value, index) =>
            Number.isFinite(value) && value >= 60 ? value : defaultRosterColWidths[index],
          )
        : [...defaultRosterColWidths],
    eval_rows: p3?.eval_rows ?? [],
  };
};

const fetchWithAuth = (input: RequestInfo | URL, init?: RequestInit) =>
  fetch(input, { ...init, credentials: 'include' });

function MonthlyReportExportContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const reportId = searchParams.get('report_id') ?? '';
  const [draft, setDraft] = useState<Draft | null>(null);
  const [monthRef, setMonthRef] = useState('');
  const [globalTeacherName, setGlobalTeacherName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const pagesContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        if (token) {
          const raw = window.localStorage.getItem(`${EXPORT_DRAFT_STORAGE_KEY_PREFIX}${token}`);
          if (raw) {
            const payload = JSON.parse(raw) as ExportPayload;
            if (mounted) {
              setDraft(payload.draft);
              setMonthRef(payload.month_ref || '');
              setGlobalTeacherName(payload.global_teacher_name || '');
              setIsLoading(false);
            }
            return;
          }
        }

        if (!reportId) {
          throw new Error('找不到匯出資料，請回到月報頁重新點擊匯出。');
        }

        const response = await fetchWithAuth(`${API_BASE_URL}/api/monthly-reports/${reportId}`);
        if (!response.ok) {
          throw new Error(`讀取月報失敗 (${response.status})`);
        }
        const report = (await response.json()) as MonthlyReportResponse;
        if (!mounted) return;
        setDraft(buildDraftFromStoredContent(report));
        setMonthRef(report.month_ref || '');
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : '載入失敗');
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [token, reportId]);

  const monthHeading = formatMonthRefHeading(monthRef);
  const teacherDisplayName = draft?.teacher_name || globalTeacherName || '未設定';
  const monthlyFeeTotal = useMemo(
    () =>
      (draft?.roster_rows ?? []).reduce((sum, row) => {
        const value = Number(String(row.monthly_fee).replace(/,/g, '').trim());
        return sum + (Number.isNaN(value) ? 0 : value);
      }, 0),
    [draft?.roster_rows],
  );
  const evalRowsForExport = useMemo(
    () => getEvalRowsForExport(draft?.eval_rows ?? [], monthRef),
    [draft?.eval_rows, monthRef],
  );
  const handleExportPdf = useReactToPrint({
    contentRef: pagesContainerRef,
    documentTitle: `${monthRef || 'monthly-report'}-月報`,
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
      setActionMessage('');
    },
    onAfterPrint: () => {
      setIsExporting(false);
      setActionMessage('已開啟列印視窗，請選擇「儲存為 PDF」。');
    },
    onPrintError: (_location, error) => {
      setIsExporting(false);
      setActionMessage(`匯出失敗：${error.message}`);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#e8efeb] p-6">
        <div className="mx-auto max-w-xl rounded-xl border border-[#c7d4ce] bg-white p-6 text-center text-[#2f6a5b] font-bold">
          匯出頁面載入中...
        </div>
      </div>
    );
  }

  if (!draft || error) {
    return (
      <div className="min-h-screen bg-[#e8efeb] p-6">
        <div className="mx-auto max-w-xl space-y-3 rounded-xl border border-[#e3c4c4] bg-white p-6 text-center">
          <div className="text-base font-bold text-[#7b2f2f]">無法載入月報匯出內容</div>
          <div className="text-sm text-[#875858]">{error || '資料不存在'}</div>
          <Link href="/monthly-reports" className="inline-flex rounded-lg border border-[#b8c8bf] px-3 py-2 text-sm font-bold text-[#2f6a5b]">
            回月報頁
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#dde6e2] p-4 md:p-6">
      <div className="mx-auto w-fit space-y-4 print:space-y-0">
        <div className="print:hidden rounded-xl border border-[#c7d4ce] bg-white/90 px-4 py-3 text-sm text-[#3d5750]">
          三頁 A4 HTML 匯出預覽（可用瀏覽器列印另存 PDF）
        </div>

        <div ref={pagesContainerRef} className="space-y-4 print:space-y-0">
        <article data-export-page="true" className="w-[210mm] h-[297mm] box-border overflow-hidden rounded-xl border border-[#c5d0ca] bg-white p-[14mm] print:rounded-none print:border-0 print:break-after-page print:break-inside-avoid-page">
          <div className="mb-3 h-[18mm] w-full overflow-hidden rounded-sm bg-white print:rounded-none">
            <img
              src={MONTHLY_REPORT_HEADER_IMAGE_PATH}
              alt="月報頁首"
              className="h-full w-full object-contain object-center"
            />
          </div>
          <div className="text-center text-xl font-black tracking-[0.08em] text-[#1f312a]">中華學習障礙協會</div>
          <div className="text-center text-sm font-bold text-[#385148] mb-3">{monthHeading}課表（教師別）</div>
          <div className="mb-3">
            <label className="text-sm text-[#4a6159] mr-2">教師</label>
            <span className="inline-flex rounded border border-[#c6d3cc] bg-[#f4f7f5] px-3 py-1 text-sm font-bold text-[#1f312a] min-w-[180px]">
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
                <th className="border-2 border-[#62756d] p-2 whitespace-nowrap">一</th>
                <th className="border-2 border-[#62756d] p-2 whitespace-nowrap">二</th>
                <th className="border-2 border-[#62756d] p-2 whitespace-nowrap">三</th>
                <th className="border-2 border-[#62756d] p-2 whitespace-nowrap">四</th>
                <th className="border-2 border-[#62756d] p-2 whitespace-nowrap">五</th>
                <th className="border-2 border-[#62756d] p-2 whitespace-nowrap">六</th>
              </tr>
            </thead>
            <tbody>
              {draft.schedule_rows.map((row, idx) => (
                <tr key={`${row.time}-${idx}`}>
                  <td className="border-2 border-[#62756d] p-2 text-center font-bold align-middle whitespace-nowrap">{row.time}</td>
                  {scheduleColumns.map((col) => (
                    <td key={col} className="border-2 border-[#62756d] p-1 align-middle">
                      <div className="w-full min-h-[104px] border-0 bg-transparent p-1 leading-6 whitespace-pre overflow-hidden">
                        {row[col] || '\u00a0'}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article data-export-page="true" className="w-[210mm] h-[297mm] box-border overflow-hidden rounded-xl border border-[#c5d0ca] bg-white p-[14mm] print:rounded-none print:border-0 print:break-after-page print:break-inside-avoid-page">
          <div className="mb-3 h-[18mm] w-full overflow-hidden rounded-sm bg-white print:rounded-none">
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
                {rosterHeaders.map((label) => (
                  <th key={label} className="border-2 border-[#62756d] p-2 align-middle">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {draft.roster_rows.map((row, idx) => (
                <tr key={`roster-${idx}`} className="h-12">
                  {rosterColumns.map((col) => (
                    <td key={col} className="border-2 border-[#62756d] px-2 py-1 align-middle">
                      <div className={`block h-8 w-full bg-transparent px-1 py-0 text-sm leading-8 whitespace-nowrap overflow-hidden ${rosterNumericFields.includes(col) ? 'text-right' : ''}`}>
                        {row[col] || '\u00a0'}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="bg-[#f8fbf9]">
                <td className="border-2 border-[#62756d] p-2 text-right font-bold" colSpan={5}>每月學費合計</td>
                <td className="border-2 border-[#62756d] p-2 font-bold text-right">{monthlyFeeTotal}</td>
                <td className="border-2 border-[#62756d] p-2" />
                <td className="border-2 border-[#62756d] p-2" />
              </tr>
            </tbody>
          </table>
        </article>

        <article data-export-page="true" className="w-[210mm] h-[297mm] box-border overflow-hidden rounded-xl border border-[#c5d0ca] bg-white p-[14mm] print:rounded-none print:border-0 print:break-after-auto print:break-inside-avoid-page">
          <div className="mb-3 h-[18mm] w-full overflow-hidden rounded-sm bg-white print:rounded-none">
            <img
              src={MONTHLY_REPORT_HEADER_IMAGE_PATH}
              alt="月報頁首"
              className="h-full w-full object-contain object-center"
            />
          </div>
          <div className="text-center text-xl font-black tracking-[0.08em] text-[#1f312a] mb-3">教師評核統計表（教師別）</div>
          <table className="w-full table-fixed border-collapse text-sm">
            <colgroup>
              {evalColumns.map((col) => (
                <col key={`eval-col-${col}`} style={{ width: `${MONTHLY_REPORT_EVAL_COL_WIDTHS_PX[col]}px` }} />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-[#eef3f1]">
                {evalHeaders.map((label) => (
                  <th key={label} className="border-2 border-[#62756d] p-2 align-middle">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {evalRowsForExport.map((row, idx) => (
                <tr key={`eval-${idx}`} className="h-12">
                  {evalColumns.map((col) => (
                    <td key={col} className="border-2 border-[#62756d] px-2 py-1 align-middle">
                      <div className={`block h-8 w-full bg-transparent px-1 py-0 text-sm leading-8 whitespace-nowrap overflow-hidden ${evalNumericFields.includes(col) ? 'text-right' : ''}`}>
                        {row[col] || '\u00a0'}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </article>
        </div>
        <div className="print:hidden sticky bottom-4 z-10 flex items-center justify-center gap-3 rounded-xl border border-[#c7d4ce] bg-white/95 p-3 backdrop-blur">
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExporting}
            className="rounded-lg bg-[#2f6a5b] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {isExporting ? '匯出中...' : '匯出 PDF'}
          </button>
          {!!actionMessage && <span className="text-sm font-bold text-[#2f6a5b]">{actionMessage}</span>}
        </div>
      </div>
    </div>
  );
}

export default function MonthlyReportExportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#e8efeb] p-6">
          <div className="mx-auto max-w-xl rounded-xl border border-[#c7d4ce] bg-white p-6 text-center text-[#2f6a5b] font-bold">
            匯出頁面載入中...
          </div>
        </div>
      }
    >
      <MonthlyReportExportContent />
    </Suspense>
  );
}
