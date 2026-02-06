
import React, { useState, useMemo } from 'react';
import { Assessment, CourseType, COURSE_TYPE_SESSIONS, Payment, PaymentMethod, PaymentStatus, Student, StudentStatus, InvoiceStatus } from '../types';
import { PlusIcon, XIcon, SearchIcon, FileTextIcon, ChevronLeftIcon } from './Icons';
import { useToast } from './Toast';

interface PaymentListProps {
  payments: Payment[];
  students: Student[];
  assessments: Assessment[];
  apiBaseUrl?: string;
  onCreatePayment?: (payload: Partial<Payment>) => Promise<void>;
  onUpdatePayment?: (id: string, payload: Partial<Payment>) => Promise<void>;
  onDeletePayment?: (id: string) => Promise<void>;
  onLogActivity?: (category: '繳費', action: string, description: string) => void;
  onReload?: () => void | Promise<void>;
}

// Internal Modal Component
interface ModalProps {
  title: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onDelete?: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ title, onClose, onSubmit, onDelete, children }) => (
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
             <button type="button" onClick={onDelete} className="flex-1 px-4 py-2 border border-red-200 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 transition-all">刪除</button>
           )}
           <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all">取消</button>
           <button type="submit" className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 shadow-lg shadow-amber-200 transition-all">儲存紀錄</button>
        </div>
      </form>
    </div>
  </div>
);

export const PaymentList: React.FC<PaymentListProps> = ({
  payments,
  students,
  assessments,
  onCreatePayment,
  onUpdatePayment,
  onDeletePayment,
  onLogActivity,
  onReload,
}) => {
  const { toast } = useToast();
  const [modalType, setModalType] = useState<'ADD' | 'EDIT' | null>(null);
  const [editingPayment, setEditingPayment] = useState<Partial<Payment> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [bulkCreating, setBulkCreating] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(() => new Set([currentMonth]));

  const getStudent = (id: string) => students.find(s => s.id === id);
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

  const getCourseType = (studentId?: string): CourseType | null => {
    if (!studentId) return null;
    const assessment = latestAssessmentByStudent.get(studentId);
    return (assessment?.metrics?.course_type as CourseType | undefined) ?? null;
  };

  const calculateSessions = (studentId?: string) => {
    const courseType = getCourseType(studentId);
    return courseType ? COURSE_TYPE_SESSIONS[courseType] : 0;
  };

  const selectedCourseType = editingPayment?.student_id ? getCourseType(editingPayment.student_id) : null;

  // Group by Month (YYYY-MM)
  const paymentsByMonth = useMemo(() => {
     const groups: Record<string, Payment[]> = {};
     payments.forEach(p => {
        const key = p.month_ref || '未分類';
        if (!groups[key]) groups[key] = [];
        groups[key].push(p);
     });
     return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [payments]);

  const paymentsByMonthMap = useMemo(() => {
    const map = new Map<string, Payment[]>();
    paymentsByMonth.forEach(([month, list]) => {
      map.set(month, list);
    });
    return map;
  }, [paymentsByMonth]);

  const handleOpenEdit = (p: Payment) => {
    setEditingPayment({ ...p });
    setModalType('EDIT');
  };

  const handleOpenAdd = () => {
    setEditingPayment({
      status: PaymentStatus.UNPAID,
      month_ref: new Date().toISOString().slice(0, 7), // YYYY-MM
      amount: 0,
      sessions_count: 0,
      method: PaymentMethod.CASH,
    });
    setModalType('ADD');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment?.student_id) {
      toast('請選擇個案', 'warning');
      return;
    }
    const studentName = getStudent(editingPayment.student_id)?.name;
    const action = modalType === 'ADD' ? '新增繳費' : '修改繳費';
    
    try {
      if (modalType === 'ADD') {
        await onCreatePayment?.({
          student_id: editingPayment.student_id,
          amount: editingPayment.amount,
          status: editingPayment.status,
          invoice_status: editingPayment.invoice_status,
          paid_at: editingPayment.paid_at,
          method: editingPayment.method,
          sessions_count: editingPayment.sessions_count,
          month_ref: editingPayment.month_ref,
        });
      } else if (modalType === 'EDIT' && editingPayment?.id) {
        await onUpdatePayment?.(editingPayment.id, {
          amount: editingPayment.amount,
          status: editingPayment.status,
          invoice_status: editingPayment.invoice_status,
          paid_at: editingPayment.paid_at,
          method: editingPayment.method,
          sessions_count: editingPayment.sessions_count,
          month_ref: editingPayment.month_ref,
        });
      }
      onLogActivity?.('繳費', action, `${action}: ${studentName} (${editingPayment.month_ref}) 金額 $${editingPayment.amount}`);
      toast(`${action} 成功！`, 'success');
      setModalType(null);
    } catch (error) {
      console.error('Failed to save payment:', error);
      toast('繳費紀錄儲存失敗。', 'error');
    }
  };

  const handleDelete = async () => {
    if (!editingPayment?.id) return;
    if (!confirm('確定要刪除此繳費紀錄嗎？')) return;
    try {
      await onDeletePayment?.(editingPayment.id);
      setModalType(null);
    } catch (error) {
      console.error('Failed to delete payment:', error);
      toast('刪除失敗。', 'error');
    }
  };

  const calculateExpected = (studentId?: string) => {
    if (!studentId) return 0;
    const student = getStudent(studentId);
    return student?.default_fee || 0;
  };

  const months = useMemo(() => {
    const start = new Date(2025, 1, 1);
    const now = new Date();
    const list: string[] = [];
    const cursor = new Date(start);
    cursor.setDate(1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    while (cursor <= end) {
      const month = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      list.push(month);
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return list.reverse();
  }, []);

  const monthOptions = useMemo(() => {
    const options = [...months];
    if (paymentsByMonthMap.has('未分類')) {
      options.push('未分類');
    }
    return options;
  }, [months, paymentsByMonthMap]);

  const monthsToRender = useMemo(() => {
    if (selectedMonth === 'ALL') return monthOptions;
    return [selectedMonth];
  }, [selectedMonth, monthOptions]);

  React.useEffect(() => {
    if (selectedMonth === 'ALL') {
      setExpandedMonths(new Set([currentMonth]));
    } else {
      setExpandedMonths(new Set([selectedMonth]));
    }
  }, [selectedMonth, currentMonth]);

  const toggleMonth = (month: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(month)) {
        next.delete(month);
      } else {
        next.add(month);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedMonths(new Set(monthOptions));
  };

  const collapseAll = () => {
    setExpandedMonths(new Set());
  };

  const handleBulkCreate = async (month: string) => {
    if (!onCreatePayment) return;
    if (bulkCreating) return;
    setBulkCreating(month);
    try {
      const activeStudents = students.filter((s) => s.status === StudentStatus.ACTIVE);
      const existing = new Set(
        payments
          .filter((p) => p.month_ref === month)
          .map((p) => p.student_id),
      );

      let createdCount = 0;

      for (const student of activeStudents) {
        if (existing.has(student.id)) continue;
        const sessionsCount = calculateSessions(student.id);
        await onCreatePayment({
          student_id: student.id,
          month_ref: month,
          amount: student.default_fee ?? 0,
          status: PaymentStatus.UNPAID,
          method: PaymentMethod.CASH,
          sessions_count: sessionsCount > 0 ? sessionsCount : undefined,
        });
        createdCount += 1;
      }

      onLogActivity?.('繳費', '批次建立繳費', `建立 ${month} 未繳紀錄 ${createdCount} 筆。`);
      toast(createdCount > 0 ? `已建立 ${createdCount} 筆繳費紀錄` : '本月沒有新增繳費紀錄', 'success');
      if (onReload) {
        await onReload();
      }
    } catch (error) {
      console.error('Failed to bulk create payments:', error);
      toast('批次建立失敗。', 'error');
    } finally {
      setBulkCreating(null);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col overflow-hidden relative">
      {/* Add/Edit Modal */}
      {modalType && editingPayment && (
        <Modal 
          title={modalType === 'ADD' ? "新增繳費紀錄" : "編輯繳費明細"} 
          onClose={() => setModalType(null)} 
          onSubmit={handleSave}
          onDelete={modalType === 'EDIT' ? handleDelete : undefined}
        >
          <div className="space-y-4 text-sm">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">個案姓名 *</label>
              {modalType === 'ADD' ? (
                <select 
                  className="w-full p-2 border rounded-lg bg-white"
                  value={editingPayment.student_id || ''}
                  onChange={e => {
                    const sid = e.target.value;
                    setEditingPayment({
                      ...editingPayment, 
                      student_id: sid,
                      amount: calculateExpected(sid),
                      sessions_count: calculateSessions(sid)
                    });
                  }}
                  required
                >
                  <option value="">請選擇個案...</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.type} 類)</option>)}
                </select>
              ) : (
                <div className="p-2 bg-slate-50 border rounded-lg font-bold text-slate-700">
                  {getStudent(editingPayment.student_id!)?.name}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">對應月份</label>
                <input
                  type="month"
                  className="w-full p-2 border rounded-lg"
                  value={editingPayment.month_ref || ''}
                  onChange={e => setEditingPayment({...editingPayment, month_ref: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">繳費狀態</label>
                <select
                  className="w-full p-2 border rounded-lg bg-white font-bold"
                  value={editingPayment.status}
                  onChange={e => setEditingPayment({...editingPayment, status: e.target.value as PaymentStatus})}
                >
                  {Object.values(PaymentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">繳費日期</label>
                <input
                  type="date"
                  className="w-full p-2 border rounded-lg"
                  value={editingPayment.paid_at || ''}
                  onChange={e => setEditingPayment({...editingPayment, paid_at: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">繳費方式</label>
                <select
                  className="w-full p-2 border rounded-lg bg-white"
                  value={editingPayment.method || PaymentMethod.CASH}
                  onChange={e => setEditingPayment({...editingPayment, method: e.target.value as PaymentMethod})}
                >
                  {Object.values(PaymentMethod).map((method) => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">開票狀態</label>
                <select
                  className="w-full p-2 border rounded-lg bg-white"
                  value={editingPayment.invoice_status || InvoiceStatus.NOT_ISSUED}
                  onChange={e => setEditingPayment({...editingPayment, invoice_status: e.target.value as InvoiceStatus})}
                >
                  {Object.values(InvoiceStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">當月堂數</label>
                <input 
                  type="number" 
                  className="w-full p-2 border rounded-lg"
                  value={editingPayment.sessions_count || 0}
                  onChange={e => {
                    const count = parseInt(e.target.value);
                    setEditingPayment({
                      ...editingPayment, 
                      sessions_count: count,
                    });
                  }}
                />
                {selectedCourseType && (
                  <div className="mt-1 text-[9px] font-bold text-slate-400">
                    課程類型: {selectedCourseType}（建議 {COURSE_TYPE_SESSIONS[selectedCourseType]} 堂）
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">實收金額</label>
                <input 
                  type="number" 
                  className="w-full p-2 border rounded-lg font-black text-indigo-600"
                  value={editingPayment.amount || 0}
                  onChange={e => setEditingPayment({...editingPayment, amount: parseInt(e.target.value)})}
                />
                {editingPayment.student_id && (
                  <div className="mt-1 text-[9px] font-bold text-slate-400">
                    預設月費: ${calculateExpected(editingPayment.student_id).toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">備註事項</label>
              <textarea 
                className="w-full p-2 border rounded-lg h-20 text-xs"
                placeholder="如：現金支付、包含教材費、補課扣除等..."
                value={editingPayment.note || ''}
                onChange={e => setEditingPayment({...editingPayment, note: e.target.value})}
              />
            </div>
          </div>
        </Modal>
      )}

      <div className="p-4 border-b bg-slate-50/50 flex flex-col sm:flex-row justify-end items-start sm:items-center gap-3">
        <div className="flex gap-2 w-full sm:w-auto flex-wrap">
          <div className="relative flex-1 sm:flex-none">
             <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
             <input 
               type="text" 
               placeholder="搜尋姓名..." 
               className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full outline-none focus:ring-2 focus:ring-amber-500/20"
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
             />
          </div>
          <select
            className="px-3 py-2 border rounded-lg text-sm bg-white font-bold text-slate-600"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="ALL">全部月份</option>
            {monthOptions.map((month) => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
          <button 
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-bold hover:bg-amber-600 shadow-md shadow-amber-100 transition-all flex items-center gap-2"
          >
             <PlusIcon className="w-4 h-4" />
             新增紀錄
          </button>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={expandAll}
              className="px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-all"
            >
              全部展開
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-all"
            >
              全部收起
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 bg-slate-50/30">
        <div className="space-y-6">
          {monthsToRender.map((month) => {
            const monthPayments = paymentsByMonthMap.get(month) ?? [];
            const filtered = monthPayments.filter(p => getStudent(p.student_id)?.name?.includes(searchTerm));
            const totalAmount = filtered.reduce((sum, p) => sum + (p.amount || 0), 0);
            const isExpanded = expandedMonths.has(month);

            return (
              <div key={month} className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleMonth(month)}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-all"
                      aria-label={isExpanded ? '收起月份' : '展開月份'}
                    >
                      <ChevronLeftIcon className={`w-3.5 h-3.5 transition-transform ${isExpanded ? '-rotate-90' : ''}`} />
                    </button>
                    <h3 className="font-bold text-slate-800 font-mono">{month}</h3>
                  </div>
                  <div className="flex items-center gap-2 sm:ml-auto flex-nowrap overflow-x-auto whitespace-nowrap">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-white px-2 py-0.5 rounded-full border border-slate-100">
                      {filtered.length} 筆紀錄
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-white px-2 py-0.5 rounded-full border border-slate-100">
                      合計 ${totalAmount.toLocaleString()}
                    </span>
                    {month !== '未分類' && (
                      <button
                        onClick={() => handleBulkCreate(month)}
                        disabled={bulkCreating === month}
                        className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-all disabled:opacity-60"
                      >
                        {bulkCreating === month ? '建立中...' : '一鍵建立'}
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px] sm:min-w-[860px] text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b">
                          <tr>
                            <th className="p-4">個案</th>
                            <th className="p-4">類型</th>
                            <th className="p-4">堂數</th>
                            <th className="p-4">方式</th>
                            <th className="p-4">金額</th>
                            <th className="p-4">狀態</th>
                            <th className="p-4">開票</th>
                            <th className="p-4 text-right">管理</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filtered.length > 0 ? (
                            filtered.map((p) => {
                              const student = getStudent(p.student_id);
                              const isUnpaid = p.status === PaymentStatus.UNPAID;

                              return (
                                <tr key={p.id} className="hover:bg-slate-50 transition-all">
                                  <td className="p-4 font-bold text-slate-700">{student?.name || '未知個案'}</td>
                                  <td className="p-4 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                    {student?.type ? `${student.type} 類` : '-'}
                                  </td>
                                  <td className="p-4 text-slate-600">{p.sessions_count || 0}</td>
                                  <td className="p-4 text-slate-600">{p.method || PaymentMethod.CASH}</td>
                                  <td className={`p-4 font-mono font-black ${isUnpaid ? 'text-red-600' : 'text-slate-800'}`}>
                                    ${p.amount.toLocaleString()}
                                  </td>
                                  <td className="p-4">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${isUnpaid ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                      {p.status}
                                    </span>
                                  </td>
                                  <td className="p-4 text-[10px] text-slate-500">{p.invoice_status || '未開立'}</td>
                                  <td className="p-4 text-right">
                                    <button
                                      onClick={() => handleOpenEdit(p)}
                                      className="p-2 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all"
                                    >
                                      <FileTextIcon className="w-5 h-5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={8} className="p-6 text-center text-xs text-slate-400">
                                目前無繳費紀錄
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
