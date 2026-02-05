
import React, { useState, useMemo } from 'react';
import { Student, StudentStatus, Payment, Assessment, ScheduleSlot, Session, AttendanceStatus, TimeSlot, PaymentStatus } from '../types';
import { SearchIcon, ChevronLeftIcon, UsersIcon, ChartBarIcon, PlusIcon, XIcon, CheckCircleIcon, CalendarIcon, CreditCardIcon, FileTextIcon, HistoryIcon } from './Icons';

interface StudentManagerProps {
  students: Student[];
  payments: Payment[];
  assessments: Assessment[];
  slots: ScheduleSlot[];
  sessions: Session[];
  onLogActivity?: (category: any, action: string, description: string) => void;
}

const TIME_SLOTS: TimeSlot[] = [
  '09:00 - 10:40', '10:40 - 12:20', '12:00 - 13:00', '13:00 - 15:00', '15:00 - 17:00', '17:00 - 19:00', '19:00 - 21:00'
];

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
           <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">儲存資料</button>
        </div>
      </form>
    </div>
  </div>
);

export const StudentManager: React.FC<StudentManagerProps> = ({ students, payments, assessments, slots, sessions, onLogActivity }) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SCHEDULE' | 'PAYMENTS' | 'ASSESSMENTS'>('OVERVIEW');
  
  const [modalType, setModalType] = useState<'STUDENT' | 'SLOT' | 'PAYMENT' | 'ASSESSMENT' | null>(null);
  const [editingData, setEditingData] = useState<any>(null);

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  const closeModal = () => {
    setModalType(null);
    setEditingData(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const isNew = !editingData?.id;
    let action = '';
    let desc = '';
    let category: any = '個案';

    switch(modalType) {
      case 'STUDENT':
        action = isNew ? '新增個案' : '編輯個案';
        desc = `${action}: ${editingData.name}`;
        break;
      case 'SLOT':
        category = '課程';
        action = isNew ? '新增固定排課' : '編輯固定排課';
        desc = `${action} (${selectedStudent?.name}): 週${editingData.weekday} ${editingData.time_slot}`;
        break;
      case 'PAYMENT':
        category = '繳費';
        action = isNew ? '新增繳費紀錄' : '編輯繳費紀錄';
        desc = `${action} (${selectedStudent?.name}): ${editingData.month_ref} 金額 $${editingData.amount}`;
        break;
      case 'ASSESSMENT':
        category = '個案';
        action = isNew ? '新增檢測報告' : '編輯檢測報告';
        desc = `${action} (${selectedStudent?.name}): ${editingData.assessed_at}`;
        break;
    }

    onLogActivity?.(category, action, desc);
    alert(`${action} 成功！(模擬操作)`);
    closeModal();
  };

  if (!selectedStudent) {
    const filteredStudents = students.filter(s => s.name.includes(filter) || s.phone?.includes(filter));
    return (
      <div className="bg-white rounded-xl shadow-sm h-full flex flex-col border border-slate-200 overflow-hidden relative">
        {modalType === 'STUDENT' && (
          <Modal title={editingData?.id ? "編輯個案" : "新增個案"} onClose={closeModal} onSubmit={handleSave}>
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
            </div>
          </Modal>
        )}
        
        <div className="p-4 border-b flex justify-between items-center bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><UsersIcon className="w-5 h-5 text-indigo-600" />個案管理</h2>
          <div className="flex gap-2">
            <div className="relative">
               <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
               <input type="text" placeholder="搜尋..." className="pl-9 pr-4 py-2 border rounded-lg text-sm w-48 sm:w-64 outline-none focus:ring-2 focus:ring-indigo-500/20" value={filter} onChange={e => setFilter(e.target.value)} />
            </div>
            <button onClick={() => { setEditingData({ status: StudentStatus.PENDING, type: 'A', tags: [] }); setModalType('STUDENT'); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-md transition-all"><PlusIcon className="w-4 h-4" />新增個案</button>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-slate-500 sticky top-0 z-10 border-b">
              <tr>
                <th className="p-4 font-bold text-[10px] uppercase tracking-widest">姓名</th>
                <th className="p-4 font-bold text-[10px] uppercase tracking-widest">目前年齡</th>
                <th className="p-4 font-bold text-[10px] uppercase tracking-widest">狀態</th>
                <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-right">管理</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map(student => (
                <tr key={student.id} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="p-4 font-bold text-slate-700">{student.name}</td>
                  <td className="p-4 text-slate-500 font-medium">{calculateAge(student.birthday)}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${student.status === StudentStatus.ACTIVE ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{student.status}</span>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => setSelectedStudentId(student.id)} className="text-indigo-600 hover:text-indigo-700 font-bold transition-colors">查看詳情</button>
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
  const studentPayments = payments.filter(p => p.student_id === selectedStudent.id);
  const studentAssessments = assessments.filter(a => a.student_id === selectedStudent.id);
  const studentSlots = slots.filter(s => s.student_id === selectedStudent.id);

  return (
    <div className="bg-white rounded-xl shadow-sm h-full flex flex-col border border-slate-200 overflow-hidden relative">
      {modalType === 'STUDENT' && (
        <Modal title="編輯基本資料" onClose={closeModal} onSubmit={handleSave}>
           <div className="grid grid-cols-2 gap-4">
             <div className="col-span-2"><label className="block text-[10px] font-black text-slate-400 mb-1">姓名</label><input type="text" value={editingData?.name} onChange={e => setEditingData({...editingData, name: e.target.value})} className="w-full p-2 border rounded text-sm" /></div>
             <div><label className="block text-[10px] font-black text-slate-400 mb-1">生日</label><input type="date" value={editingData?.birthday || ''} onChange={e => setEditingData({...editingData, birthday: e.target.value})} className="w-full p-2 border rounded text-sm" /></div>
             <div><label className="block text-[10px] font-black text-slate-400 mb-1">聯絡電話</label><input type="text" value={editingData?.phone || ''} onChange={e => setEditingData({...editingData, phone: e.target.value})} className="w-full p-2 border rounded text-sm" /></div>
           </div>
        </Modal>
      )}

      {modalType === 'ASSESSMENT' && (
        <Modal title={editingData?.id ? "編輯檢測報告" : "新增檢測報告"} onClose={closeModal} onSubmit={handleSave}>
          <div className="grid grid-cols-2 gap-4">
             <div className="col-span-2">
               <label className="block text-[10px] font-black text-slate-400 mb-1">檢測日期</label>
               <input type="date" value={editingData?.assessed_at || ''} onChange={e => setEditingData({...editingData, assessed_at: e.target.value})} className="w-full p-2 border rounded text-sm" />
               <div className="mt-2 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded inline-block">
                 受測時年齡：{calculateAge(selectedStudent.birthday, editingData?.assessed_at)}
               </div>
             </div>
             <div><label className="block text-[10px] font-black text-slate-400 mb-1">視覺年齡 (Y-M)</label><input type="text" value={editingData?.metrics?.visual_age || ''} onChange={e => setEditingData({...editingData, metrics: {...editingData.metrics, visual_age: e.target.value}})} className="w-full p-2 border rounded text-sm" placeholder="如: 4-6" /></div>
             <div><label className="block text-[10px] font-black text-slate-400 mb-1">聽覺年齡 (Y-M)</label><input type="text" value={editingData?.metrics?.auditory_age || ''} onChange={e => setEditingData({...editingData, metrics: {...editingData.metrics, auditory_age: e.target.value}})} className="w-full p-2 border rounded text-sm" placeholder="如: 5-0" /></div>
             <div className="col-span-2"><label className="block text-[10px] font-black text-slate-400 mb-1">專業評估總結</label><textarea value={editingData?.summary || ''} onChange={e => setEditingData({...editingData, summary: e.target.value})} className="w-full p-2 border rounded h-24 text-sm" /></div>
          </div>
        </Modal>
      )}

      {modalType === 'SLOT' && (
        <Modal title={editingData?.id ? "編輯排課" : "新增排課"} onClose={closeModal} onSubmit={handleSave}>
          <div className="grid grid-cols-2 gap-4">
             <div><label className="block text-[10px] font-black text-slate-400 mb-1">星期</label><select value={editingData?.weekday || 1} onChange={e => setEditingData({...editingData, weekday: parseInt(e.target.value)})} className="w-full p-2 border rounded text-sm bg-white"><option value={1}>週一</option><option value={2}>週二</option><option value={3}>週三</option><option value={4}>週四</option><option value={5}>週五</option><option value={6}>週六</option><option value={7}>週日</option></select></div>
             <div><label className="block text-[10px] font-black text-slate-400 mb-1">時段</label><select value={editingData?.time_slot || TIME_SLOTS[0]} onChange={e => setEditingData({...editingData, time_slot: e.target.value})} className="w-full p-2 border rounded text-sm bg-white">{TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
             <div className="col-span-2"><label className="block text-[10px] font-black text-slate-400 mb-1">備註</label><input type="text" value={editingData?.note || ''} onChange={e => setEditingData({...editingData, note: e.target.value})} className="w-full p-2 border rounded text-sm" /></div>
          </div>
        </Modal>
      )}

      {modalType === 'PAYMENT' && (
        <Modal title={editingData?.id ? "編輯繳費" : "新增繳費"} onClose={closeModal} onSubmit={handleSave}>
          <div className="grid grid-cols-2 gap-4">
             <div><label className="block text-[10px] font-black text-slate-400 mb-1">月份 (YYYY-MM)</label><input type="text" value={editingData?.month_ref || ''} onChange={e => setEditingData({...editingData, month_ref: e.target.value})} className="w-full p-2 border rounded text-sm" /></div>
             <div><label className="block text-[10px] font-black text-slate-400 mb-1">金額</label><input type="number" value={editingData?.amount || 0} onChange={e => setEditingData({...editingData, amount: parseInt(e.target.value)})} className="w-full p-2 border rounded text-sm" /></div>
             <div><label className="block text-[10px] font-black text-slate-400 mb-1">堂數</label><input type="number" value={editingData?.sessions_count || 0} onChange={e => setEditingData({...editingData, sessions_count: parseInt(e.target.value)})} className="w-full p-2 border rounded text-sm" /></div>
             <div><label className="block text-[10px] font-black text-slate-400 mb-1">狀態</label><select value={editingData?.status || PaymentStatus.UNPAID} onChange={e => setEditingData({...editingData, status: e.target.value})} className="w-full p-2 border rounded text-sm bg-white"><option value={PaymentStatus.UNPAID}>未繳</option><option value={PaymentStatus.PAID}>已繳</option></select></div>
          </div>
        </Modal>
      )}
      
      <div className="p-4 border-b flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-4">
          <button onClick={() => setSelectedStudentId(null)} className="p-1.5 hover:bg-white rounded-lg border border-slate-200 text-slate-500 shadow-sm transition-all"><ChevronLeftIcon className="w-5 h-5" /></button>
          <div>
            <h2 className="text-lg font-bold text-slate-800">{selectedStudent.name}</h2>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">目前年齡: {calculateAge(selectedStudent.birthday)} • <span className="text-emerald-600">{selectedStudent.status}</span></div>
          </div>
        </div>
      </div>

      <div className="flex border-b text-sm font-bold text-slate-400 bg-white sticky top-0 z-10 px-4">
         {(['OVERVIEW', 'SCHEDULE', 'PAYMENTS', 'ASSESSMENTS'] as const).map(tab => (
           <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-3 border-b-2 transition-all ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent hover:text-slate-600'}`}>
             {tab === 'OVERVIEW' && '基本概覽'}{tab === 'SCHEDULE' && '課程安排'}{tab === 'PAYMENTS' && '繳費歷程'}{tab === 'ASSESSMENTS' && '能力檢測'}
           </button>
         ))}
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 bg-slate-50/30">
        {activeTab === 'OVERVIEW' && (
          <div className="max-w-4xl space-y-6">
            <div className="bg-white p-6 rounded-xl border shadow-sm">
               <div className="flex justify-between items-start mb-4">
                 <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><UsersIcon className="w-4 h-4" /> 基本個案資料</h3>
                 <button onClick={() => { setEditingData({...selectedStudent}); setModalType('STUDENT'); }} className="text-xs text-indigo-600 font-bold hover:underline">編輯個案</button>
               </div>
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-sm">
                 <div><div className="text-slate-400 text-xs mb-1">目前年齡</div><div className="font-bold text-indigo-600 text-base">{calculateAge(selectedStudent.birthday)}</div></div>
                 <div><div className="text-slate-400 text-xs mb-1">出生日期</div><div className="font-bold text-slate-700">{selectedStudent.birthday || '未填寫'}</div></div>
                 <div><div className="text-slate-400 text-xs mb-1">聯絡電話</div><div className="font-bold text-slate-700">{selectedStudent.phone || '未提供'}</div></div>
                 <div><div className="text-slate-400 text-xs mb-1">預設堂費</div><div className="font-bold text-slate-700">${selectedStudent.default_fee || 0}</div></div>
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
                      <button onClick={() => { setEditingData({...a}); setModalType('ASSESSMENT'); }} className="text-xs text-indigo-600 font-bold hover:underline">編輯檢測資料</button>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                       <div className="bg-slate-50 p-3 rounded-xl text-center border border-slate-100">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">視覺年齡</div>
                          <div className="text-xl font-black text-indigo-600 font-mono">{a.metrics.visual_age || '-'}</div>
                       </div>
                       <div className="bg-slate-50 p-3 rounded-xl text-center border border-slate-100">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">聽覺年齡</div>
                          <div className="text-xl font-black text-indigo-600 font-mono">{a.metrics.auditory_age || '-'}</div>
                       </div>
                       <div className="bg-slate-50 p-3 rounded-xl text-center border border-slate-100">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">動覺年齡</div>
                          <div className="text-xl font-black text-indigo-600 font-mono">{a.metrics.kinetic_age || '-'}</div>
                       </div>
                    </div>
                    <div className="p-4 bg-indigo-50/30 rounded-xl border border-indigo-100">
                       <div className="text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-2">專業評估總結</div>
                       <p className="text-xs text-indigo-900/70 leading-relaxed italic">{a.summary || '未填寫評估說明。'}</p>
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
                <button onClick={() => { setEditingData({ student_id: selectedStudent.id, weekday: 1, time_slot: TIME_SLOTS[0] }); setModalType('SLOT'); }} className="text-xs bg-white border px-3 py-1.5 rounded-lg font-bold text-indigo-600 flex items-center gap-1 shadow-sm hover:bg-slate-50 transition-all"><PlusIcon className="w-3 h-3" />新增排課</button>
             </div>
             <div className="bg-white rounded-xl border overflow-hidden shadow-sm divide-y">
                {studentSlots.map(slot => (
                  <div key={slot.id} className="p-4 flex justify-between items-center group hover:bg-slate-50 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded flex items-center justify-center font-bold">週{slot.weekday}</div>
                      <div><div className="font-bold text-slate-700">{slot.time_slot}</div><div className="text-xs text-slate-400">{slot.note || '例行排課'}</div></div>
                    </div>
                    <button onClick={() => { setEditingData({...slot}); setModalType('SLOT'); }} className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-indigo-600 transition-all"><FileTextIcon className="w-4 h-4" /></button>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'PAYMENTS' && (
          <div className="max-w-4xl space-y-4">
             <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold text-slate-700">繳費歷史紀錄</h3>
                <button onClick={() => { setEditingData({ student_id: selectedStudent.id, status: PaymentStatus.UNPAID, amount: selectedStudent.default_fee || 0 }); setModalType('PAYMENT'); }} className="text-xs bg-white border px-3 py-1.5 rounded-lg font-bold text-amber-600 flex items-center gap-1 shadow-sm hover:bg-slate-50 transition-all"><PlusIcon className="w-3 h-3" />新增繳費</button>
             </div>
             <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                   <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b">
                      <tr><th className="p-4">月份</th><th className="p-4">金額</th><th className="p-4">狀態</th><th className="p-4 text-right">管理</th></tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {studentPayments.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-all">
                           <td className="p-4 font-bold text-slate-700 font-mono">{p.month_ref}</td>
                           <td className="p-4 font-mono font-black text-slate-800">${p.amount.toLocaleString()}</td>
                           <td className="p-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${p.status === '已繳' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>{p.status}</span></td>
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
