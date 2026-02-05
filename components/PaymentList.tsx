
import React, { useState, useMemo } from 'react';
import { Payment, PaymentStatus, Student } from '../types';
import { CreditCardIcon, PlusIcon, XIcon, SearchIcon, FileTextIcon, CheckCircleIcon } from './Icons';

interface PaymentListProps {
  payments: Payment[];
  students: Student[];
  onLogActivity?: (category: '繳費', action: string, description: string) => void;
}

// Internal Modal Component
interface ModalProps {
  title: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ title, onClose, onSubmit, children }) => (
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
           <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all">取消</button>
           <button type="submit" className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 shadow-lg shadow-amber-200 transition-all">儲存紀錄</button>
        </div>
      </form>
    </div>
  </div>
);

export const PaymentList: React.FC<PaymentListProps> = ({ payments, students, onLogActivity }) => {
  const [modalType, setModalType] = useState<'ADD' | 'EDIT' | null>(null);
  const [editingPayment, setEditingPayment] = useState<Partial<Payment> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const getStudent = (id: string) => students.find(s => s.id === id);

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

  const handleOpenEdit = (p: Payment) => {
    setEditingPayment({ ...p });
    setModalType('EDIT');
  };

  const handleOpenAdd = () => {
    setEditingPayment({
      status: PaymentStatus.UNPAID,
      month_ref: new Date().toISOString().slice(0, 7), // YYYY-MM
      amount: 0,
      sessions_count: 4
    });
    setModalType('ADD');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment?.student_id) {
      alert("請選擇個案");
      return;
    }
    const studentName = getStudent(editingPayment.student_id)?.name;
    const action = modalType === 'ADD' ? '新增繳費' : '修改繳費';
    
    onLogActivity?.('繳費', action, `${action}: ${studentName} (${editingPayment.month_ref}) 金額 $${editingPayment.amount}`);
    alert(`${action} 成功！(模擬操作)`);
    setModalType(null);
  };

  const calculateExpected = (studentId?: string, count?: number) => {
    if (!studentId || !count) return 0;
    const student = getStudent(studentId);
    return (student?.default_fee || 0) * count;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col overflow-hidden relative">
      {/* Add/Edit Modal */}
      {modalType && editingPayment && (
        <Modal 
          title={modalType === 'ADD' ? "新增繳費紀錄" : "編輯繳費明細"} 
          onClose={() => setModalType(null)} 
          onSubmit={handleSave}
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
                    const student = getStudent(sid);
                    setEditingPayment({
                      ...editingPayment, 
                      student_id: sid,
                      amount: calculateExpected(sid, editingPayment.sessions_count)
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
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">對應月份 (YYYY-MM)</label>
                <input 
                  type="text" 
                  placeholder="2023-10"
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">預排堂數</label>
                <input 
                  type="number" 
                  className="w-full p-2 border rounded-lg"
                  value={editingPayment.sessions_count || 0}
                  onChange={e => {
                    const count = parseInt(e.target.value);
                    setEditingPayment({
                      ...editingPayment, 
                      sessions_count: count,
                      amount: calculateExpected(editingPayment.student_id, count)
                    });
                  }}
                />
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
                    預期應收: ${calculateExpected(editingPayment.student_id, editingPayment.sessions_count).toLocaleString()}
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

      <div className="p-4 border-b bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <CreditCardIcon className="w-5 h-5 text-amber-500" />
          繳費管理總覽
        </h2>
        <div className="flex gap-2 w-full sm:w-auto">
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
          <button 
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-bold hover:bg-amber-600 shadow-md shadow-amber-100 transition-all flex items-center gap-2"
          >
             <PlusIcon className="w-4 h-4" />
             新增紀錄
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-8 bg-slate-50/30">
        {paymentsByMonth.map(([month, monthPayments]) => {
          const filtered = monthPayments.filter(p => getStudent(p.student_id)?.name.includes(searchTerm));
          if (filtered.length === 0) return null;

          return (
            <div key={month} className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
               <div className="flex items-center gap-3 px-1">
                  <h3 className="font-bold text-slate-800 font-mono">{month}</h3>
                  <div className="h-px bg-slate-200 flex-1"></div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-white px-2 py-0.5 rounded-full border border-slate-100">
                    {filtered.length} 筆紀錄
                  </span>
               </div>

               <div className="grid grid-cols-1 gap-3">
                  {filtered.map(p => {
                     const student = getStudent(p.student_id);
                     const isUnpaid = p.status === PaymentStatus.UNPAID;
                     const expectedAmount = calculateExpected(p.student_id, p.sessions_count);
                     const isDiff = expectedAmount > 0 && expectedAmount !== p.amount;

                     return (
                       <div 
                          key={p.id} 
                          className="bg-white p-4 rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-md cursor-pointer transition-all flex items-center justify-between group relative"
                       >
                          <div className="flex items-center gap-4">
                             <div 
                                onClick={(e) => { e.stopPropagation(); alert('快速切換狀態 (模擬)'); }}
                                title="快速切換狀態"
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-colors
                                  ${isUnpaid ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-100'}`}>
                                {isUnpaid ? '欠' : '收'}
                             </div>
                             <div>
                                <div className="flex items-center gap-2">
                                   <span className="font-bold text-slate-800">{student?.name || '未知個案'}</span>
                                   <span className="text-[10px] bg-slate-50 px-1.5 py-0.5 rounded text-slate-500 font-bold uppercase tracking-wider border border-slate-100">
                                      {student?.type} 類
                                   </span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-1 font-medium flex items-center gap-2">
                                   <span>{p.sessions_count || 0} 堂課</span>
                                   {isDiff && <span className="text-amber-600 font-bold bg-amber-50 px-1.5 rounded flex items-center gap-1">⚠️ 金額不符</span>}
                                   <span className="text-slate-300">|</span>
                                   <span className="truncate max-w-[150px]">{p.note || '學費紀錄'}</span>
                                </div>
                             </div>
                          </div>

                          <div className="text-right flex items-center gap-4">
                             <div className="flex flex-col items-end">
                                <div className={`font-mono font-black text-lg leading-none mb-1 ${isUnpaid ? 'text-red-600' : 'text-slate-800'}`}>
                                   ${p.amount.toLocaleString()}
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border
                                   ${isUnpaid ? 'bg-red-50 text-red-600 border-red-100' : 
                                     p.status === PaymentStatus.CLOSED ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                   {p.status}
                                </span>
                             </div>
                             <button 
                                onClick={() => handleOpenEdit(p)}
                                className="p-2 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all"
                             >
                                <FileTextIcon className="w-5 h-5" />
                             </button>
                          </div>
                       </div>
                     );
                  })}
               </div>
            </div>
          );
        })}

        {paymentsByMonth.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 py-20">
             <CreditCardIcon className="w-16 h-16 mb-4 opacity-10" />
             <p className="font-bold italic">尚無任何繳費紀錄</p>
          </div>
        )}
      </div>
    </div>
  );
};
