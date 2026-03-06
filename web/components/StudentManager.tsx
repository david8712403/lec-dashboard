
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Student, StudentStatus, Payment, Assessment, ScheduleSlot, Session, AttendanceStatus, TimeSlot, PaymentStatus, CourseType, COURSE_TYPE_SESSIONS, PaymentMethod, InvoiceStatus } from '../types';
import { SearchIcon, ChevronLeftIcon, UsersIcon, ChartBarIcon, PlusIcon, XIcon, FileTextIcon } from './Icons';
import { useToast } from './Toast';
import { AssessmentModal } from './AssessmentModal';
import { ScheduleGrid } from './ScheduleGrid';

interface StudentManagerProps {
  students: Student[];
  payments: Payment[];
  assessments: Assessment[];
  slots: ScheduleSlot[];
  sessions: Session[];
  apiBaseUrl?: string;
  onCreateStudent?: (payload: Partial<Student>) => Promise<void>;
  onUpdateStudent?: (id: string, payload: Partial<Student>) => Promise<void>;
  onDeleteStudent?: (id: string) => Promise<void>;
  onCreateSlot?: (payload: Partial<ScheduleSlot>) => Promise<void>;
  onUpdateSlot?: (id: string, payload: Partial<ScheduleSlot>) => Promise<void>;
  onDeleteSlot?: (id: string) => Promise<void>;
  onCreatePayment?: (payload: Partial<Payment>) => Promise<void>;
  onUpdatePayment?: (id: string, payload: Partial<Payment>) => Promise<void>;
  onDeletePayment?: (id: string) => Promise<void>;
  onCreateAssessment?: (payload: Partial<Assessment>) => Promise<void>;
  onUpdateAssessment?: (id: string, payload: Partial<Assessment>) => Promise<void>;
  onDeleteAssessment?: (id: string) => Promise<void>;
  onCreateSession?: (payload: Partial<Session>) => Promise<void>;
  onUpdateSession?: (id: string, payload: Partial<Session>) => Promise<void>;
  onDeleteSession?: (id: string) => Promise<void>;
  onBulkCreateWeekSessions?: (payload: {
    week_start?: string;
    weekStart?: string;
    anchor_date?: string;
    anchorDate?: string;
    tz_offset?: number;
    tzOffset?: number;
    student_id?: string;
    studentId?: string;
  }, options?: { reloadAfter?: boolean }) => Promise<{ createdCount: number; weekStart: string; weekEnd: string }>;
  onLogActivity?: (category: any, action: string, description: string) => void;
}

const TIME_SLOTS: TimeSlot[] = [
  { start_time: '09:00', end_time: '10:40' },
  { start_time: '10:40', end_time: '12:20' },
  { start_time: '12:00', end_time: '13:00' },
  { start_time: '13:00', end_time: '15:00' },
  { start_time: '15:00', end_time: '17:00' },
  { start_time: '17:00', end_time: '19:00' },
  { start_time: '19:00', end_time: '21:00' },
];

const formatTimeRange = (start?: string, end?: string) => {
  if (start && end) return `${start} - ${end}`;
  return start || end || '';
};

const timeSlotValue = (slot: TimeSlot) => formatTimeRange(slot.start_time, slot.end_time);

const parseTimeValue = (value: string) => {
  const [start, end] = value.split('-').map((part) => part.trim());
  return { start_time: start || '', end_time: end || '' };
};

const CALENDAR_WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'] as const;

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getWeekStartDate = (date: Date) => {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
};

const getMonthWeekStartKeys = (date: Date) => {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const cursor = getWeekStartDate(monthStart);
  const keys: string[] = [];
  while (cursor <= monthEnd) {
    keys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }
  return keys;
};

const isAttendedSession = (attendance?: AttendanceStatus) =>
  attendance === AttendanceStatus.PRESENT || attendance === AttendanceStatus.MAKEUP;

const getAttendancePillClass = (attendance?: AttendanceStatus) => {
  if (attendance === AttendanceStatus.PRESENT) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (attendance === AttendanceStatus.MAKEUP) return 'border-violet-200 bg-violet-50 text-violet-700';
  if (attendance === AttendanceStatus.ABSENT) return 'border-red-200 bg-red-50 text-red-700';
  return 'border-slate-200 bg-slate-50 text-slate-600';
};

// Utility to calculate age in "Y-M" format
const calculateAge = (birthday: string | undefined, refDate: string = new Date().toISOString().split('T')[0]): string => {
  if (!birthday) return '未設定生日';
  const birth = new Date(birthday);
  const now = new Date(refDate);
  
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  
  if (now.getDate() < birth.getDate()) {
    months--;
  }
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  return `${years} 歲 ${months} 個月`;
};

interface ModalProps {
  title: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onDelete?: () => void;
  deleteLabel?: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ title, onClose, onSubmit, onDelete, deleteLabel, children }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
      <div className="p-4 border-b bg-slate-50/50 flex justify-between items-center">
        <h3 className="font-bold text-slate-800">{title}</h3>
        <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-400">
          <XIcon className="w-5 h-5" />
        </button>
      </div>
      <form onSubmit={onSubmit} className="p-6 space-y-4">
        {children}
        <div className="pt-4 flex gap-3">
           {onDelete && (
             <button type="button" onClick={onDelete} className="flex-1 px-4 py-2 border border-red-200 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 transition-all">{deleteLabel || '刪除'}</button>
           )}
           <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all">取消</button>
           <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">儲存資料</button>
        </div>
      </form>
    </div>
  </div>
);

export const StudentManager: React.FC<StudentManagerProps> = ({
  students,
  payments,
  assessments,
  slots,
  sessions,
  onCreateStudent,
  onUpdateStudent,
  onDeleteStudent,
  onCreateSlot,
  onUpdateSlot,
  onDeleteSlot,
  onCreatePayment,
  onUpdatePayment,
  onDeletePayment,
  onCreateAssessment,
  onUpdateAssessment,
  onDeleteAssessment,
  onCreateSession,
  onUpdateSession,
  onDeleteSession,
  onBulkCreateWeekSessions,
  onLogActivity,
}) => {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SCHEDULE' | 'TIMETABLE' | 'PAYMENTS' | 'ASSESSMENTS'>('OVERVIEW');
  const [sortKey, setSortKey] = useState<'name' | 'age' | 'status' | 'entry_date'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  
  const [modalType, setModalType] = useState<'STUDENT' | 'SLOT' | 'SESSION' | 'PAYMENT' | 'ASSESSMENT' | null>(null);
  const [editingData, setEditingData] = useState<any>(null);
  const [scheduleMode, setScheduleMode] = useState<'week' | 'month'>('week');
  const [scheduleDate, setScheduleDate] = useState(new Date());
  const [isCreatingWeekSessions, setIsCreatingWeekSessions] = useState(false);
  const [isCreatingMonthSessions, setIsCreatingMonthSessions] = useState(false);

  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const selectedStudentFromQuery = searchParams.get('studentId');
  const tabFromQuery = searchParams.get('tab');
  const tabValues = ['OVERVIEW', 'SCHEDULE', 'TIMETABLE', 'PAYMENTS', 'ASSESSMENTS'] as const;

  useEffect(() => {
    if (selectedStudentFromQuery) {
      setSelectedStudentId(selectedStudentFromQuery);
    }
    if (tabFromQuery && tabValues.includes(tabFromQuery as any)) {
      setActiveTab(tabFromQuery as typeof activeTab);
    }
  }, [selectedStudentFromQuery, tabFromQuery]);

  useEffect(() => {
    setScheduleMode('week');
    setScheduleDate(new Date());
  }, [selectedStudentId]);
  const latestAssessmentByStudent = useMemo(() => {
    const map = new Map<string, Assessment>();
    assessments.forEach((assessment) => {
      const existing = map.get(assessment.student_id);
      if (!existing || assessment.assessed_at > existing.assessed_at) {
        map.set(assessment.student_id, assessment);
      }
    });
    return map;
  }, [assessments]);

  const getLatestAssessment = (studentId: string) => latestAssessmentByStudent.get(studentId);
  const getCourseType = (studentId: string): CourseType | null => {
    const assessment = getLatestAssessment(studentId);
    return (assessment?.metrics?.course_type as CourseType | undefined) ?? null;
  };

  const entryDateByStudent = useMemo(() => {
    const map = new Map<string, string>();
    students.forEach((student) => {
      if (student.created_at) {
        map.set(student.id, student.created_at);
      }
    });
    return map;
  }, [students]);

  const getEntryDate = (studentId: string) => entryDateByStudent.get(studentId);

  const toggleSort = (key: typeof sortKey) => {
    if (key === sortKey) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir('asc');
  };

  const getSortIndicator = (key: typeof sortKey) => {
    if (key !== sortKey) return '↕';
    return sortDir === 'asc' ? '▲' : '▼';
  };

  const buildStudentUrl = useCallback(
    (studentId?: string | null, tab?: typeof activeTab | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (studentId) {
        params.set('studentId', studentId);
      } else {
        params.delete('studentId');
      }
      if (tab) {
        params.set('tab', tab);
      } else {
        params.delete('tab');
      }
      const query = params.toString();
      return query ? `${pathname}?${query}` : pathname;
    },
    [pathname, searchParams],
  );

  const filteredStudents = useMemo(() => {
    const base = students.filter(
      (s) => s.name.includes(filter) || s.phone?.includes(filter),
    );

    const sorted = [...base].sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      switch (sortKey) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'age': {
          const now = Date.now();
          const aTime = a.birthday ? new Date(a.birthday).getTime() : 0;
          const bTime = b.birthday ? new Date(b.birthday).getTime() : 0;
          aValue = aTime ? now - aTime : -1;
          bValue = bTime ? now - bTime : -1;
          break;
        }
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'entry_date': {
          const aEntry = getEntryDate(a.id) || '';
          const bEntry = getEntryDate(b.id) || '';
          aValue = aEntry;
          bValue = bEntry;
          break;
        }
        default:
          break;
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        if (aValue < 0 && bValue < 0) return 0;
        if (aValue < 0) return 1;
        if (bValue < 0) return -1;
        const diff = aValue - bValue;
        return sortDir === 'asc' ? diff : -diff;
      }

      if (sortKey === 'entry_date') {
        if (!aValue && !bValue) return 0;
        if (!aValue) return 1;
        if (!bValue) return -1;
      }

      const compare = String(aValue).localeCompare(String(bValue), 'zh-Hant');
      return sortDir === 'asc' ? compare : -compare;
    });

    return sorted;
  }, [filter, students, sortKey, sortDir, entryDateByStudent]);

  const closeModal = () => {
    setModalType(null);
    setEditingData(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const isNew = !editingData?.id;
    let action = '';
    let desc = '';
    let category: any = '個案';

    try {
      switch(modalType) {
        case 'STUDENT': {
          action = isNew ? '新增個案' : '編輯個案';
          desc = `${action}: ${editingData.name}`;
          if (isNew) {
            await onCreateStudent?.({
              name: editingData.name,
              birthday: editingData.birthday,
              phone: editingData.phone,
              type: editingData.type,
              grade: editingData.grade,
              default_fee: editingData.default_fee,
              status: editingData.status ?? StudentStatus.PENDING_TEST,
              tags: editingData.tags ?? [],
            });
          } else {
            await onUpdateStudent?.(editingData.id, {
              name: editingData.name,
              birthday: editingData.birthday,
              phone: editingData.phone,
              type: editingData.type,
              grade: editingData.grade,
              default_fee: editingData.default_fee,
              status: editingData.status ?? selectedStudent?.status,
            });
          }
          break;
        }
        case 'SLOT': {
          category = '課程';
          action = isNew ? '新增固定排課' : '編輯固定排課';
          desc = `${action} (${selectedStudent?.name}): 週${editingData.weekday} ${formatTimeRange(editingData.start_time, editingData.end_time)}`;
          if (isNew) {
            await onCreateSlot?.({
              student_id: selectedStudent?.id,
              weekday: editingData.weekday,
              start_time: editingData.start_time,
              end_time: editingData.end_time,
              note: editingData.note,
            });
          } else {
            await onUpdateSlot?.(editingData.id, {
              weekday: editingData.weekday,
              start_time: editingData.start_time,
              end_time: editingData.end_time,
              note: editingData.note,
            });
          }
          break;
        }
        case 'SESSION': {
          category = '課程';
          action = isNew ? '新增課程紀錄' : '調整課程時段';
          const studentName = selectedStudent?.name || '個案';
          desc = `${action} (${studentName}): ${editingData.session_date} ${formatTimeRange(editingData.start_time, editingData.end_time)} ${editingData.attendance || AttendanceStatus.UNKNOWN}`;
          if (isNew) {
            await onCreateSession?.({
              student_id: selectedStudent?.id,
              session_date: editingData.session_date,
              start_time: editingData.start_time,
              end_time: editingData.end_time,
              attendance: editingData.attendance || AttendanceStatus.UNKNOWN,
              note: editingData.note,
            });
          } else {
            await onUpdateSession?.(editingData.id, {
              session_date: editingData.session_date,
              start_time: editingData.start_time,
              end_time: editingData.end_time,
              attendance: editingData.attendance,
              note: editingData.note,
            });
          }
          break;
        }
        case 'PAYMENT': {
          category = '繳費';
          action = isNew ? '新增繳費紀錄' : '編輯繳費紀錄';
          desc = `${action} (${selectedStudent?.name}): ${editingData.month_ref} 金額 $${editingData.amount}`;
          if (isNew) {
            await onCreatePayment?.({
              student_id: selectedStudent?.id,
              month_ref: editingData.month_ref,
              amount: editingData.amount,
              sessions_count: editingData.sessions_count,
              status: editingData.status,
              paid_at: editingData.paid_at,
              invoice_status: editingData.invoice_status,
              method: editingData.method,
            });
          } else {
            await onUpdatePayment?.(editingData.id, {
              month_ref: editingData.month_ref,
              amount: editingData.amount,
              sessions_count: editingData.sessions_count,
              status: editingData.status,
              paid_at: editingData.paid_at,
              invoice_status: editingData.invoice_status,
              method: editingData.method,
            });
          }
          break;
        }
        case 'ASSESSMENT': {
          category = '個案';
          action = isNew ? '新增檢測報告' : '編輯檢測報告';
          desc = `${action} (${selectedStudent?.name}): ${editingData.assessed_at}`;
          if (isNew) {
            await onCreateAssessment?.({
              student_id: selectedStudent?.id,
              assessed_at: editingData.assessed_at,
              summary: editingData.summary,
              metrics: editingData.metrics,
              scoring_system: editingData.scoring_system ?? 'LEC-Standard',
            });
          } else {
            await onUpdateAssessment?.(editingData.id, {
              assessed_at: editingData.assessed_at,
              summary: editingData.summary,
              metrics: editingData.metrics,
            });
          }
          break;
        }
      }

      onLogActivity?.(category, action, desc);
      toast(`${action} 成功！`, 'success');
      closeModal();
    } catch (error) {
      console.error('Failed to save:', error);
      toast('儲存失敗，請稍後再試。', 'error');
    }
  };

  const handleDelete = async () => {
    if (!editingData?.id || !modalType) return;
    if (!confirm('確定要刪除這筆資料嗎？')) return;

    try {
      switch (modalType) {
        case 'STUDENT':
          await onDeleteStudent?.(editingData.id);
          break;
        case 'SLOT':
          await onDeleteSlot?.(editingData.id);
          break;
        case 'SESSION':
          await onDeleteSession?.(editingData.id);
          break;
        case 'PAYMENT':
          await onDeletePayment?.(editingData.id);
          break;
        case 'ASSESSMENT':
          await onDeleteAssessment?.(editingData.id);
          break;
      }
      closeModal();
    } catch (error) {
      console.error('Failed to delete:', error);
      toast('刪除失敗，請稍後再試。', 'error');
    }
  };

  if (!selectedStudent) {
    return (
      <div className="bg-white rounded-xl shadow-sm h-full flex flex-col border border-slate-200 overflow-hidden relative">
        {modalType === 'STUDENT' && (
        <Modal title={editingData?.id ? "編輯個案" : "新增個案"} onClose={closeModal} onSubmit={handleSave} onDelete={editingData?.id ? handleDelete : undefined}>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">姓名 *</label>
                <input type="text" required value={editingData?.name || ''} onChange={e => setEditingData({...editingData, name: e.target.value})} className="w-full px-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">生日</label>
                <input type="date" value={editingData?.birthday || ''} onChange={e => setEditingData({...editingData, birthday: e.target.value})} className="w-full px-4 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">類型</label>
                <select value={editingData?.type || 'A'} onChange={e => setEditingData({...editingData, type: e.target.value})} className="w-full px-4 py-2 border rounded-lg text-sm bg-white">
                  <option value="A">A 類</option><option value="B">B 類</option><option value="C">C 類</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">個案狀態</label>
                <select
                  value={editingData?.status || StudentStatus.PENDING_TEST}
                  onChange={e => setEditingData({ ...editingData, status: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg text-sm bg-white"
                >
                  {Object.values(StudentStatus).map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">預設月費</label>
                <input
                  type="number"
                  value={editingData?.default_fee || 0}
                  onChange={e => setEditingData({ ...editingData, default_fee: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">年級</label>
                <select value={editingData?.grade || ''} onChange={e => setEditingData({...editingData, grade: e.target.value || undefined})} className="w-full px-4 py-2 border rounded-lg text-sm bg-white">
                  <option value="">未設定</option>
                  <option value="幼幼班">幼幼班</option><option value="小班">小班</option><option value="中班">中班</option><option value="大班">大班</option>
                  <option value="小一">小一</option><option value="小二">小二</option><option value="小三">小三</option><option value="小四">小四</option>
                  <option value="小五">小五</option><option value="小六">小六</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">聯絡電話</label>
                <input type="text" value={editingData?.phone || ''} onChange={e => setEditingData({...editingData, phone: e.target.value})} className="w-full px-4 py-2 border rounded-lg text-sm" />
              </div>
            </div>
          </Modal>
        )}

        <div className="p-4 border-b flex flex-wrap justify-end items-center gap-2 bg-slate-50/50">
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative">
               <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
               <input type="text" placeholder="搜尋..." className="pl-9 pr-4 py-2 border rounded-lg text-sm w-48 sm:w-64 outline-none focus:ring-2 focus:ring-indigo-500/20" value={filter} onChange={e => setFilter(e.target.value)} />
            </div>
            <button onClick={() => { setEditingData({ status: StudentStatus.PENDING_TEST, type: 'A', tags: [] }); setModalType('STUDENT'); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-md transition-all"><PlusIcon className="w-4 h-4" />新增個案</button>
          </div>
        </div>
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <table className="w-full min-w-[620px] sm:min-w-[700px] text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50/80 text-slate-500 sticky top-0 z-10 border-b">
              <tr>
                <th className="p-3 font-bold text-[10px] uppercase tracking-widest">
                  <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-slate-700">
                    姓名
                    <span className="text-[9px] text-slate-300">{getSortIndicator('name')}</span>
                  </button>
                </th>
                <th className="p-3 font-bold text-[10px] uppercase tracking-widest">
                  <button onClick={() => toggleSort('age')} className="flex items-center gap-1 hover:text-slate-700">
                    目前年齡
                    <span className="text-[9px] text-slate-300">{getSortIndicator('age')}</span>
                  </button>
                </th>
                <th className="p-3 font-bold text-[10px] uppercase tracking-widest">
                  <button onClick={() => toggleSort('entry_date')} className="flex items-center gap-1 hover:text-slate-700">
                    入室日期
                    <span className="text-[9px] text-slate-300">{getSortIndicator('entry_date')}</span>
                  </button>
                </th>
                <th className="p-3 font-bold text-[10px] uppercase tracking-widest">
                  <button onClick={() => toggleSort('status')} className="flex items-center gap-1 hover:text-slate-700">
                    狀態
                    <span className="text-[9px] text-slate-300">{getSortIndicator('status')}</span>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map(student => (
                <tr
                  key={student.id}
                  className="hover:bg-indigo-50/30 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedStudentId(student.id);
                    router.push(buildStudentUrl(student.id, 'OVERVIEW'));
                  }}
                >
                  <td className="p-3 font-bold text-slate-700">{student.name}</td>
                  <td className="p-3 text-slate-500 font-medium">{calculateAge(student.birthday)}</td>
                  <td className="p-3 text-slate-500 font-medium">{getEntryDate(student.id) || '-'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${student.status === StudentStatus.ACTIVE ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{student.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredStudents.length === 0 && <div className="p-20 text-center text-slate-400 italic">找不到符合的個案</div>}
        </div>
      </div>
    );
  }

  // Detail View Data
  const studentPayments = payments
    .filter(p => p.student_id === selectedStudent.id)
    .sort((a, b) => (b.month_ref || '').localeCompare(a.month_ref || ''));
  const studentAssessments = assessments
    .filter(a => a.student_id === selectedStudent.id)
    .sort((a, b) => b.assessed_at.localeCompare(a.assessed_at));
  const studentSlots = slots.filter(s => s.student_id === selectedStudent.id);
  const studentSessions = sessions
    .filter((s) => s.student_id === selectedStudent.id)
    .sort((a, b) => {
      if (a.session_date !== b.session_date) {
        return a.session_date.localeCompare(b.session_date);
      }
      if (a.start_time !== b.start_time) {
        return a.start_time.localeCompare(b.start_time);
      }
      return a.end_time.localeCompare(b.end_time);
    });
  const latestAssessment = getLatestAssessment(selectedStudent.id);
  const latestCourseType = latestAssessment?.metrics?.course_type as CourseType | undefined;
  const recommendedSessions = latestCourseType ? COURSE_TYPE_SESSIONS[latestCourseType] : null;
  const activeMonthRef = `${scheduleDate.getFullYear()}-${String(scheduleDate.getMonth() + 1).padStart(2, '0')}`;
  const activeMonthHeading = `${scheduleDate.getFullYear()}年${String(scheduleDate.getMonth() + 1).padStart(2, '0')}月`;
  const monthSessions = studentSessions.filter((session) =>
    session.session_date?.startsWith(activeMonthRef),
  );
  const monthAttendedSessions = monthSessions.filter((session) => isAttendedSession(session.attendance));
  const monthSessionsByDate = new Map<string, Session[]>();
  for (const session of monthSessions) {
    if (!session.session_date) continue;
    const current = monthSessionsByDate.get(session.session_date) ?? [];
    current.push(session);
    monthSessionsByDate.set(session.session_date, current);
  }
  for (const [key, list] of monthSessionsByDate.entries()) {
    monthSessionsByDate.set(
      key,
      list.slice().sort((a, b) => {
        if (a.start_time !== b.start_time) return a.start_time.localeCompare(b.start_time);
        return a.end_time.localeCompare(b.end_time);
      }),
    );
  }

  const year = scheduleDate.getFullYear();
  const month = scheduleDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const leadingEmpty = (firstDay.getDay() + 6) % 7; // Monday first
  const monthCalendarCells: Array<{ key: string; date: Date | null; dateKey: string | null }> = [];
  for (let i = 0; i < leadingEmpty; i += 1) {
    monthCalendarCells.push({ key: `empty-start-${i}`, date: null, dateKey: null });
  }
  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = new Date(year, month, day);
    monthCalendarCells.push({ key: toDateKey(date), date, dateKey: toDateKey(date) });
  }
  while (monthCalendarCells.length % 7 !== 0) {
    monthCalendarCells.push({ key: `empty-end-${monthCalendarCells.length}`, date: null, dateKey: null });
  }
  const monthCalendarWeeks: Array<Array<{ key: string; date: Date | null; dateKey: string | null }>> = [];
  for (let i = 0; i < monthCalendarCells.length; i += 7) {
    monthCalendarWeeks.push(monthCalendarCells.slice(i, i + 7));
  }

  const handleBulkCreateCurrentWeek = async () => {
    if (!onBulkCreateWeekSessions || isCreatingWeekSessions || isCreatingMonthSessions) return;
    setIsCreatingWeekSessions(true);
    try {
      const weekStart = toDateKey(getWeekStartDate(scheduleDate));
      const result = await onBulkCreateWeekSessions({
        week_start: weekStart,
        student_id: selectedStudent.id,
      });
      if ((result?.createdCount ?? 0) > 0) {
        toast(`已加入 ${result.createdCount} 堂固定排課課程`, 'success');
      } else {
        toast('本週固定排課課程都已存在', 'success');
      }
    } catch (error) {
      console.error('Failed to create week sessions:', error);
      toast('加入課程失敗，請稍後再試。', 'error');
    } finally {
      setIsCreatingWeekSessions(false);
    }
  };

  const handleBulkCreateCurrentMonth = async () => {
    if (!onBulkCreateWeekSessions || isCreatingWeekSessions || isCreatingMonthSessions) return;
    setIsCreatingMonthSessions(true);
    try {
      const weekStarts = getMonthWeekStartKeys(scheduleDate);
      let createdCount = 0;
      const lastIndex = weekStarts.length - 1;
      for (const [index, weekStart] of weekStarts.entries()) {
        const result = await onBulkCreateWeekSessions({
          week_start: weekStart,
          student_id: selectedStudent.id,
        }, { reloadAfter: index === lastIndex });
        createdCount += result?.createdCount ?? 0;
      }
      if (createdCount > 0) {
        toast(`已加入 ${createdCount} 堂固定排課課程`, 'success');
      } else {
        toast('本月固定排課課程都已存在', 'success');
      }
    } catch (error) {
      console.error('Failed to create month sessions:', error);
      toast('加入課程失敗，請稍後再試。', 'error');
    } finally {
      setIsCreatingMonthSessions(false);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      {modalType === 'STUDENT' && (
        <Modal title="編輯基本資料" onClose={closeModal} onSubmit={handleSave} onDelete={editingData?.id ? handleDelete : undefined}>
           <div className="grid grid-cols-2 gap-4">
             <div className="col-span-2"><label className="block text-[10px] font-black text-slate-400 mb-1">姓名</label><input type="text" value={editingData?.name} onChange={e => setEditingData({...editingData, name: e.target.value})} className="w-full p-2 border rounded text-sm" /></div>
             <div><label className="block text-[10px] font-black text-slate-400 mb-1">生日</label><input type="date" value={editingData?.birthday || ''} onChange={e => setEditingData({...editingData, birthday: e.target.value})} className="w-full p-2 border rounded text-sm" /></div>
             <div><label className="block text-[10px] font-black text-slate-400 mb-1">聯絡電話</label><input type="text" value={editingData?.phone || ''} onChange={e => setEditingData({...editingData, phone: e.target.value})} className="w-full p-2 border rounded text-sm" /></div>
             <div>
               <label className="block text-[10px] font-black text-slate-400 mb-1">個案狀態</label>
               <select
                 value={editingData?.status || StudentStatus.PENDING_TEST}
                 onChange={e => setEditingData({ ...editingData, status: e.target.value })}
                 className="w-full p-2 border rounded text-sm bg-white"
               >
                 {Object.values(StudentStatus).map((status) => (
                   <option key={status} value={status}>{status}</option>
                 ))}
               </select>
             </div>
             <div>
               <label className="block text-[10px] font-black text-slate-400 mb-1">預設月費</label>
               <input
                 type="number"
                 value={editingData?.default_fee || 0}
                 onChange={e => setEditingData({ ...editingData, default_fee: parseInt(e.target.value) })}
                 className="w-full p-2 border rounded text-sm"
               />
             </div>
             <div><label className="block text-[10px] font-black text-slate-400 mb-1">年級</label>
               <select value={editingData?.grade || ''} onChange={e => setEditingData({...editingData, grade: e.target.value || undefined})} className="w-full p-2 border rounded text-sm bg-white">
                 <option value="">未設定</option>
                 <option value="幼幼班">幼幼班</option><option value="小班">小班</option><option value="中班">中班</option><option value="大班">大班</option>
                 <option value="小一">小一</option><option value="小二">小二</option><option value="小三">小三</option><option value="小四">小四</option>
                 <option value="小五">小五</option><option value="小六">小六</option>
               </select>
             </div>
           </div>
        </Modal>
      )}

      {modalType === 'ASSESSMENT' && selectedStudent && (
        <AssessmentModal
          assessment={editingData}
          studentId={selectedStudent.id}
          studentName={selectedStudent.name}
          onSubmitAssessment={async (payload, assessmentId) => {
            if (assessmentId) {
              await onUpdateAssessment?.(assessmentId, payload);
            } else {
              await onCreateAssessment?.(payload);
            }
          }}
          onDeleteAssessment={async (assessmentId) => {
            await onDeleteAssessment?.(assessmentId);
            onLogActivity?.('個案', '刪除檢測報告', `刪除檢測報告: ${selectedStudent.name}`);
          }}
          onSave={() => {
            const action = editingData?.id ? '編輯檢測報告' : '新增檢測報告';
            onLogActivity?.('個案', action, `${action}: ${selectedStudent.name}`);
          }}
          onClose={closeModal}
        />
      )}

      {modalType === 'SLOT' && (
        <Modal title={editingData?.id ? "編輯排課" : "新增排課"} onClose={closeModal} onSubmit={handleSave} onDelete={editingData?.id ? handleDelete : undefined}>
          <div className="grid grid-cols-2 gap-4">
             <div><label className="block text-[10px] font-black text-slate-400 mb-1">星期</label><select value={editingData?.weekday || 1} onChange={e => setEditingData({...editingData, weekday: parseInt(e.target.value)})} className="w-full p-2 border rounded text-sm bg-white"><option value={1}>週一</option><option value={2}>週二</option><option value={3}>週三</option><option value={4}>週四</option><option value={5}>週五</option><option value={6}>週六</option><option value={7}>週日</option></select></div>
             <div><label className="block text-[10px] font-black text-slate-400 mb-1">時段</label><select value={formatTimeRange(editingData?.start_time, editingData?.end_time) || timeSlotValue(TIME_SLOTS[0])} onChange={e => setEditingData({...editingData, ...parseTimeValue(e.target.value)})} className="w-full p-2 border rounded text-sm bg-white">{TIME_SLOTS.map(slot => { const value = timeSlotValue(slot); return <option key={value} value={value}>{value}</option>; })}</select></div>
             <div className="col-span-2"><label className="block text-[10px] font-black text-slate-400 mb-1">備註</label><input type="text" value={editingData?.note || ''} onChange={e => setEditingData({...editingData, note: e.target.value})} className="w-full p-2 border rounded text-sm" /></div>
          </div>
        </Modal>
      )}

      {modalType === 'SESSION' && (
        <Modal title={editingData?.id ? "編輯課程時段" : "新增課程（調課 / 補課）"} onClose={closeModal} onSubmit={handleSave} onDelete={editingData?.id ? handleDelete : undefined}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1">上課日期</label>
                <input
                  type="date"
                  value={editingData?.session_date || ''}
                  onChange={e => setEditingData({ ...editingData, session_date: e.target.value })}
                  className="w-full p-2 border rounded text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1">出席狀態</label>
                <select
                  value={editingData?.attendance || AttendanceStatus.UNKNOWN}
                  onChange={e => setEditingData({ ...editingData, attendance: e.target.value })}
                  className="w-full p-2 border rounded text-sm bg-white"
                >
                  {Object.values(AttendanceStatus).map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1">開始時間</label>
                <input
                  type="time"
                  value={editingData?.start_time || ''}
                  onChange={e => setEditingData({ ...editingData, start_time: e.target.value })}
                  className="w-full p-2 border rounded text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1">結束時間</label>
                <input
                  type="time"
                  value={editingData?.end_time || ''}
                  onChange={e => setEditingData({ ...editingData, end_time: e.target.value })}
                  className="w-full p-2 border rounded text-sm"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 mb-1">備註</label>
              <input
                type="text"
                value={editingData?.note || ''}
                onChange={e => setEditingData({ ...editingData, note: e.target.value })}
                className="w-full p-2 border rounded text-sm"
                placeholder="例如：補課、調課、臨時改期"
              />
            </div>
          </div>
        </Modal>
      )}

      {modalType === 'PAYMENT' && (
        <Modal title={editingData?.id ? "編輯繳費" : "新增繳費"} onClose={closeModal} onSubmit={handleSave} onDelete={editingData?.id ? handleDelete : undefined}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-[10px] font-black text-slate-400 mb-1">月份</label><input type="month" value={editingData?.month_ref || ''} onChange={e => setEditingData({...editingData, month_ref: e.target.value})} className="w-full p-2 border rounded text-sm" /></div>
              <div><label className="block text-[10px] font-black text-slate-400 mb-1">狀態</label><select value={editingData?.status || PaymentStatus.UNPAID} onChange={e => setEditingData({...editingData, status: e.target.value})} className="w-full p-2 border rounded text-sm bg-white"><option value={PaymentStatus.UNPAID}>未繳</option><option value={PaymentStatus.PAID}>已繳</option></select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-[10px] font-black text-slate-400 mb-1">繳費日期</label><input type="date" value={editingData?.paid_at || ''} onChange={e => setEditingData({...editingData, paid_at: e.target.value})} className="w-full p-2 border rounded text-sm" /></div>
              <div><label className="block text-[10px] font-black text-slate-400 mb-1">繳費方式</label><select value={editingData?.method || PaymentMethod.CASH} onChange={e => setEditingData({...editingData, method: e.target.value})} className="w-full p-2 border rounded text-sm bg-white">{Object.values(PaymentMethod).map(v => <option key={v} value={v}>{v}</option>)}</select></div>
              <div><label className="block text-[10px] font-black text-slate-400 mb-1">開票狀態</label><select value={editingData?.invoice_status || InvoiceStatus.NOT_ISSUED} onChange={e => setEditingData({...editingData, invoice_status: e.target.value})} className="w-full p-2 border rounded text-sm bg-white">{Object.values(InvoiceStatus).map(v => <option key={v} value={v}>{v}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1">當月堂數</label>
                <input type="number" value={editingData?.sessions_count || 0} onChange={e => setEditingData({...editingData, sessions_count: parseInt(e.target.value)})} className="w-full p-2 border rounded text-sm" placeholder="記錄上課堂數" />
                {recommendedSessions && (
                  <div className="mt-1 text-[9px] font-bold text-slate-400">
                    課程類型 {latestCourseType} 建議 {recommendedSessions} 堂
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1">實收金額</label>
                <input type="number" value={editingData?.amount || 0} onChange={e => setEditingData({...editingData, amount: parseInt(e.target.value)})} className="w-full p-2 border rounded text-sm font-bold text-indigo-600" />
                <div className="mt-1 text-[9px] font-bold text-slate-400">
                  預設月費: ${selectedStudent?.default_fee?.toLocaleString() || 0}
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
      
      <div className="p-4 border-b flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setSelectedStudentId(null);
              router.push(buildStudentUrl(null, null));
            }}
            className="p-1.5 hover:bg-white rounded-lg border border-slate-200 text-slate-500 shadow-sm transition-all"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-800">{selectedStudent.name}</h2>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">目前年齡: {calculateAge(selectedStudent.birthday)} • <span className="text-emerald-600">{selectedStudent.status}</span></div>
          </div>
        </div>
      </div>

      <div className="flex border-b text-sm font-bold text-slate-400 bg-white sticky top-0 z-10 px-4">
         {(['OVERVIEW', 'SCHEDULE', 'TIMETABLE', 'PAYMENTS', 'ASSESSMENTS'] as const).map(tab => (
           <Link
             key={tab}
             href={buildStudentUrl(selectedStudent.id, tab)}
             onClick={() => setActiveTab(tab)}
             className={`px-4 py-3 border-b-2 transition-all ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent hover:text-slate-600'}`}
           >
             {tab === 'OVERVIEW' && '基本資訊'}
             {tab === 'SCHEDULE' && '排課時段'}
             {tab === 'TIMETABLE' && '課表'}
             {tab === 'PAYMENTS' && '繳費'}
             {tab === 'ASSESSMENTS' && '檢測'}
           </Link>
         ))}
      </div>

      <div className="flex-1 overflow-auto p-1 md:p-1 bg-slate-50/30">
        {activeTab === 'OVERVIEW' && (
          <div className="max-w-4xl space-y-6">
            <div className="bg-white p-6 rounded-xl border shadow-sm">
               <div className="flex justify-between items-start mb-4">
                 <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><UsersIcon className="w-4 h-4" /> 基本個案資料</h3>
                 <button onClick={() => { setEditingData({...selectedStudent}); setModalType('STUDENT'); }} className="text-xs text-indigo-600 font-bold hover:underline">編輯個案</button>
               </div>
               <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-sm">
                 <div><div className="text-slate-400 text-xs mb-1">目前年齡</div><div className="font-bold text-indigo-600 text-base">{calculateAge(selectedStudent.birthday)}</div></div>
                 <div><div className="text-slate-400 text-xs mb-1">出生日期</div><div className="font-bold text-slate-700">{selectedStudent.birthday || '未填寫'}</div></div>
                 <div><div className="text-slate-400 text-xs mb-1">聯絡電話</div><div className="font-bold text-slate-700">{selectedStudent.phone || '未提供'}</div></div>
                 <div><div className="text-slate-400 text-xs mb-1">課程類別</div><div className="font-bold text-slate-700">{latestCourseType || '未設定'}</div></div>
                 <div><div className="text-slate-400 text-xs mb-1">年級</div><div className="font-bold text-slate-700">{selectedStudent.grade || '未設定'}</div></div>
                 <div><div className="text-slate-400 text-xs mb-1">預設月費</div><div className="font-bold text-slate-700">${selectedStudent.default_fee || 0}</div></div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'ASSESSMENTS' && (
          <div className="max-w-4xl space-y-6">
             <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold text-slate-700">能力檢測報告</h3>
                <button onClick={() => { setEditingData({ student_id: selectedStudent.id, assessed_at: new Date().toISOString().split('T')[0], metrics: {} }); setModalType('ASSESSMENT'); }} className="text-xs bg-indigo-600 px-3 py-1.5 rounded-lg font-bold text-white flex items-center gap-1 shadow-lg hover:bg-indigo-700 transition-all"><PlusIcon className="w-3 h-3" />新增報告</button>
             </div>
             <div className="grid grid-cols-1 gap-6">
               {studentAssessments.map(a => (
                 <div key={a.id} className="bg-white p-6 rounded-xl border shadow-sm group relative">
                    <div className="flex justify-between mb-4 border-b pb-4">
                      <div className="flex flex-col">
                        <div className="font-bold text-slate-800 flex items-center gap-2">
                          <ChartBarIcon className="w-4 h-4 text-indigo-600" />報告日期: {a.assessed_at}
                        </div>
                        <div className="text-[10px] text-indigo-500 font-black uppercase mt-1">受測時年齡: {calculateAge(selectedStudent.birthday, a.assessed_at)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {a.status && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            a.status === '分析中'
                              ? 'bg-blue-50 text-blue-700 border-blue-100'
                              : a.status === '待諮詢'
                              ? 'bg-amber-50 text-amber-700 border-amber-100'
                              : a.status === '完成'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}>
                            {a.status}
                          </span>
                        )}
                        <button onClick={() => { setEditingData({...a}); setModalType('ASSESSMENT'); }} className="text-xs text-indigo-600 font-bold hover:underline">編輯檢測資料</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                       <div className="bg-slate-50 p-3 rounded-xl text-center border border-slate-100">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">視覺能力</div>
                          <div className="text-xl font-black text-indigo-600 font-mono">{a.metrics.visual_ability || a.metrics.visual_age || '-'}</div>
                       </div>
                       <div className="bg-slate-50 p-3 rounded-xl text-center border border-slate-100">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">聽語能力</div>
                          <div className="text-xl font-black text-indigo-600 font-mono">{a.metrics.auditory_ability || a.metrics.auditory_age || '-'}</div>
                       </div>
                       <div className="bg-slate-50 p-3 rounded-xl text-center border border-slate-100">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">感覺動作</div>
                          <div className="text-xl font-black text-indigo-600 font-mono">{a.metrics.motor_ability || a.metrics.motor_age || a.metrics.kinetic_age || '-'}</div>
                       </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      {[
                        { key: 'visual_ratio', label: '視覺' },
                        { key: 'auditory_ratio', label: '聽語' },
                        { key: 'motor_ratio', label: '動作' },
                        { key: 'academic_ratio', label: '學科' },
                      ].map(({ key, label }) => (
                        <div key={key} className="bg-white p-3 rounded-xl border border-slate-100 text-center">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</div>
                          <div className="text-sm font-bold text-slate-700">
                            {Math.round(Number(a.metrics[key] ?? 0))}%
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mb-4 text-xs font-bold text-slate-600">
                      <span className="px-2 py-1 rounded-full bg-slate-50 border border-slate-200">
                        課程類型: {a.metrics.course_type || '未設定'}
                      </span>
                      <span className="px-2 py-1 rounded-full bg-amber-50 border border-amber-100 text-amber-700">
                        本次獲得星星數: {a.metrics.stars ?? 0} / 5
                      </span>
                    </div>
                    <div className="p-4 bg-indigo-50/30 rounded-xl border border-indigo-100">
                       <div className="text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-2">專業評估內容</div>
                       <p className="text-xs text-indigo-900/70 leading-relaxed italic">{a.metrics.professional_notes || a.summary || '未填寫評估說明。'}</p>
                       {a.metrics.pdf_attachment && (
                         <a href={a.metrics.pdf_attachment} download={`assessment-${selectedStudent.name}-${a.assessed_at}.pdf`} className="mt-3 inline-flex items-center text-xs font-bold text-indigo-600 hover:underline">
                           下載 PDF 附件
                         </a>
                       )}
                    </div>
                 </div>
               ))}
               {studentAssessments.length === 0 && <div className="p-20 text-center text-slate-400 border-2 border-dashed rounded-xl">尚無檢測資料</div>}
             </div>
          </div>
        )}

        {activeTab === 'SCHEDULE' && (
          <div className="max-w-4xl space-y-6">
             <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold text-slate-700">固定排課清單</h3>
                <button onClick={() => { setEditingData({ student_id: selectedStudent.id, weekday: 1, start_time: TIME_SLOTS[0].start_time, end_time: TIME_SLOTS[0].end_time }); setModalType('SLOT'); }} className="text-xs bg-white border px-3 py-1.5 rounded-lg font-bold text-indigo-600 flex items-center gap-1 shadow-sm hover:bg-slate-50 transition-all"><PlusIcon className="w-3 h-3" />新增排課</button>
             </div>
             <div className="bg-white rounded-xl border overflow-hidden shadow-sm divide-y">
                {studentSlots.map(slot => (
                  <div key={slot.id} className="p-4 flex justify-between items-center group hover:bg-slate-50 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded flex items-center justify-center font-bold">週{slot.weekday}</div>
                      <div><div className="font-bold text-slate-700">{formatTimeRange(slot.start_time, slot.end_time)}</div><div className="text-xs text-slate-400">{slot.note || '例行排課'}</div></div>
                    </div>
                    <button onClick={() => { setEditingData({...slot}); setModalType('SLOT'); }} className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-indigo-600 transition-all"><FileTextIcon className="w-4 h-4" /></button>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'TIMETABLE' && (
          <div className="space-y-4">
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setScheduleMode('week')}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                  scheduleMode === 'week' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                週課表
              </button>
              <button
                type="button"
                onClick={() => setScheduleMode('month')}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                  scheduleMode === 'month' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                月課表
              </button>
            </div>

            {scheduleMode === 'week' ? (
              <ScheduleGrid
                slots={studentSlots}
                sessions={studentSessions}
                students={[selectedStudent]}
                currentDate={scheduleDate}
                onWeekChange={setScheduleDate}
                showTitle={false}
                headerActions={
                  <button
                    type="button"
                    onClick={handleBulkCreateCurrentWeek}
                    disabled={!onBulkCreateWeekSessions || isCreatingWeekSessions || isCreatingMonthSessions}
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition-all hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isCreatingWeekSessions ? '加入中...' : '一鍵加入固定排課'}
                  </button>
                }
                onSessionClick={(session) => {
                  setEditingData({ ...session });
                  setModalType('SESSION');
                }}
                onDeleteSession={async (session) => {
                  const confirmed = window.confirm(`確定刪除 ${session.session_date} ${formatTimeRange(session.start_time, session.end_time)} 課程嗎？`);
                  if (!confirmed) return;
                  await onDeleteSession?.(session.id);
                }}
                onAddSession={(date, time) => {
                  setEditingData({
                    student_id: selectedStudent.id,
                    session_date: date,
                    start_time: time.start_time,
                    end_time: time.end_time,
                    attendance: AttendanceStatus.UNKNOWN,
                  });
                  setModalType('SESSION');
                }}
              />
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b bg-slate-50 px-3 py-3 sm:px-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setScheduleDate(
                          new Date(
                            scheduleDate.getFullYear(),
                            scheduleDate.getMonth() - 1,
                            1,
                          ),
                        )
                      }
                      className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition-all shadow-sm"
                    >
                      <ChevronLeftIcon className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-bold text-slate-600 font-mono tracking-tight bg-white px-2.5 py-1 rounded-lg border border-slate-100 shadow-sm">
                      {activeMonthHeading}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setScheduleDate(
                          new Date(
                            scheduleDate.getFullYear(),
                            scheduleDate.getMonth() + 1,
                            1,
                          ),
                        )
                      }
                      className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition-all shadow-sm rotate-180"
                    >
                      <ChevronLeftIcon className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkCreateCurrentMonth}
                      disabled={!onBulkCreateWeekSessions || isCreatingWeekSessions || isCreatingMonthSessions}
                      className="ml-auto rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition-all hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isCreatingMonthSessions ? '加入中...' : '一鍵加入固定排課'}
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                      本月總到課 {monthAttendedSessions.length} 堂
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <div className="min-w-[720px]">
                    <div className="grid grid-cols-7 border-b bg-slate-50/80">
                      {CALENDAR_WEEK_LABELS.map((label) => (
                        <div key={label} className="border-r last:border-r-0 px-2 py-2 text-center text-[11px] font-black text-slate-500">
                          週{label}
                        </div>
                      ))}
                    </div>
                    {monthCalendarWeeks.map((week, weekIndex) => (
                      <div key={`week-${weekIndex}`} className="grid grid-cols-7 border-b last:border-b-0">
                        {week.map((cell) => {
                          if (!cell.date || !cell.dateKey) {
                            return <div key={cell.key} className="min-h-[86px] border-r last:border-r-0 bg-slate-50/30" />;
                          }
                          const daySessions = monthSessionsByDate.get(cell.dateKey) ?? [];
                          return (
                            <div
                              key={cell.key}
                              className={`min-h-[86px] border-r last:border-r-0 p-2 ${daySessions.length > 0 ? 'bg-indigo-50/20' : 'bg-white'}`}
                            >
                              <div className="mb-1 text-xs font-black text-slate-700">{cell.date.getDate()}</div>
                              <div className="space-y-1">
                                {daySessions.slice(0, 3).map((session) => (
                                  <button
                                    key={session.id}
                                    type="button"
                                    onClick={() => {
                                      setEditingData({ ...session });
                                      setModalType('SESSION');
                                    }}
                                    className={`w-full truncate rounded border px-1.5 py-1 text-left text-[10px] font-bold ${getAttendancePillClass(session.attendance)}`}
                                    title={`${formatTimeRange(session.start_time, session.end_time)} ${session.attendance}`}
                                  >
                                    {session.start_time}-{session.end_time}<br/>{session.attendance}
                                  </button>
                                ))}
                                {daySessions.length > 3 && (
                                  <div className="text-[10px] font-bold text-slate-400">+{daySessions.length - 3}</div>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingData({
                                    student_id: selectedStudent.id,
                                    session_date: cell.dateKey,
                                    start_time: TIME_SLOTS[0].start_time,
                                    end_time: TIME_SLOTS[0].end_time,
                                    attendance: AttendanceStatus.UNKNOWN,
                                  });
                                  setModalType('SESSION');
                                }}
                                className="mt-1 w-full rounded border border-dashed border-slate-200 px-1.5 py-1 text-[10px] font-bold text-slate-400 hover:border-indigo-300 hover:text-indigo-600"
                              >
                                + 新增
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'PAYMENTS' && (
          <div className="max-w-4xl space-y-4">
             <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold text-slate-700">繳費歷史紀錄</h3>
                <button onClick={() => { setEditingData({ student_id: selectedStudent.id, status: PaymentStatus.UNPAID, amount: selectedStudent.default_fee || 0, sessions_count: recommendedSessions ?? 0, method: PaymentMethod.CASH, month_ref: new Date().toISOString().slice(0, 7) }); setModalType('PAYMENT'); }} className="text-xs bg-white border px-3 py-1.5 rounded-lg font-bold text-amber-600 flex items-center gap-1 shadow-sm hover:bg-slate-50 transition-all"><PlusIcon className="w-3 h-3" />新增繳費</button>
             </div>
             <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
                <table className="w-full min-w-[640px] sm:min-w-[720px] text-left text-sm whitespace-nowrap">
                   <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b">
                      <tr><th className="p-4">月份</th><th className="p-4">金額</th><th className="p-4">狀態</th><th className="p-4">方式</th><th className="p-4">開票</th><th className="p-4 text-right">管理</th></tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {studentPayments.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-all">
                           <td className="p-4 font-bold text-slate-700 font-mono">{p.month_ref}</td>
                           <td className="p-4 font-mono font-black text-slate-800">${p.amount.toLocaleString()}</td>
                           <td className="p-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${p.status === '已繳' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>{p.status}</span></td>
                           <td className="p-4 text-[10px] font-bold text-slate-600">{p.method || PaymentMethod.CASH}</td>
                           <td className="p-4"><span className="text-[10px] text-slate-500">{p.invoice_status || '未開立'}</span></td>
                           <td className="p-4 text-right"><button onClick={() => { setEditingData({...p}); setModalType('PAYMENT'); }} className="text-slate-300 hover:text-indigo-600 transition-all"><FileTextIcon className="w-4 h-4 inline" /></button></td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
