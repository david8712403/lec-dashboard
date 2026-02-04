import React, { useState } from 'react';
import { MOCK_STUDENTS, MOCK_PAYMENTS, MOCK_ASSESSMENTS, MOCK_SLOTS, MOCK_SESSIONS } from '../services/mockData';
import { Student, PaymentStatus, AttendanceStatus } from '../types';
import { ChevronLeft, Phone, Calendar, Tag, CreditCard, Activity, Clock, FileText, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface StudentDetailProps {
  studentId: string;
  onBack: () => void;
}

export const StudentDetail: React.FC<StudentDetailProps> = ({ studentId, onBack }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'payments' | 'assessments'>('overview');
  
  const student = MOCK_STUDENTS.find(s => s.id === studentId);
  const payments = MOCK_PAYMENTS.filter(p => p.student_id === studentId);
  const assessments = MOCK_ASSESSMENTS.filter(a => a.student_id === studentId);
  const slots = MOCK_SLOTS.filter(s => s.student_id === studentId);
  const sessions = MOCK_SESSIONS.filter(s => s.student_id === studentId);

  if (!student) return <div>Student not found</div>;

  const unpaidAmount = payments.filter(p => p.status === PaymentStatus.UNPAID).reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="bg-slate-50 min-h-screen pb-10">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-8 py-6">
            <button onClick={onBack} className="flex items-center text-slate-500 hover:text-slate-800 mb-4 transition-colors">
                <ChevronLeft size={16} className="mr-1" /> 回列表
            </button>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-2xl font-bold">
                        {student.name[0]}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            {student.name}
                            <span className={`text-xs px-2 py-1 rounded-full ${student.status === '進行中' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                {student.status}
                            </span>
                        </h1>
                        <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                            <span className="flex items-center gap-1"><Phone size={14}/> {student.phone}</span>
                            <span className="flex items-center gap-1"><Calendar size={14}/> {student.birthday}</span>
                            <span className="flex items-center gap-1">Type: {student.type}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">
                        編輯資料
                    </button>
                    <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                        快速排課
                    </button>
                </div>
            </div>
            
            {/* Tabs */}
            <div className="flex gap-6 mt-8 border-b border-slate-200">
                {[
                    { id: 'overview', label: '概覽', icon: FileText },
                    { id: 'schedule', label: '課表/時段', icon: Clock },
                    { id: 'payments', label: '繳費紀錄', icon: CreditCard },
                    { id: 'assessments', label: '檢測紀錄', icon: Activity },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
                            activeTab === tab.id 
                            ? 'border-indigo-600 text-indigo-600' 
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-8 py-8">
            
            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Key Stats */}
                    <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
                         <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-rose-50 text-rose-600 rounded-lg"><CreditCard size={24}/></div>
                            <div>
                                <p className="text-sm text-slate-500">待繳金額</p>
                                <p className="text-xl font-bold text-slate-900">${unpaidAmount.toLocaleString()}</p>
                            </div>
                         </div>
                         <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Calendar size={24}/></div>
                            <div>
                                <p className="text-sm text-slate-500">固定時段</p>
                                <p className="text-xl font-bold text-slate-900">{slots.length} 個</p>
                            </div>
                         </div>
                         <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><Activity size={24}/></div>
                            <div>
                                <p className="text-sm text-slate-500">最近檢測</p>
                                <p className="text-lg font-bold text-slate-900">{assessments[assessments.length-1]?.assessed_at || '無'}</p>
                            </div>
                         </div>
                    </div>

                    <div className="md:col-span-2 space-y-6">
                        {/* Recent Activity */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">近期上課狀況</h3>
                            {sessions.length > 0 ? (
                                <div className="space-y-4">
                                    {sessions.slice(0, 5).map(s => (
                                        <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${s.attendance === '到課' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900">{s.session_date} {s.time_slot}</p>
                                                    <p className="text-xs text-slate-500">{s.attendance} • {s.teacher_name}</p>
                                                </div>
                                            </div>
                                            {s.note && <span className="text-xs bg-white border px-2 py-1 rounded text-slate-500">{s.note}</span>}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-slate-500 text-sm">尚無上課紀錄</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6">
                         <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">標籤</h3>
                            <div className="flex flex-wrap gap-2">
                                {student.tags.map(tag => (
                                    <span key={tag} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium flex items-center gap-1">
                                        <Tag size={12} /> {tag}
                                    </span>
                                ))}
                                <button className="px-3 py-1 border border-dashed border-slate-300 text-slate-500 rounded-full text-sm hover:border-indigo-300 hover:text-indigo-600">
                                    + 新增
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Schedule Tab */}
            {activeTab === 'schedule' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                        <div className="flex justify-between items-center mb-4">
                             <h3 className="text-lg font-bold text-slate-800">固定排程 (Weekly Slots)</h3>
                             <button className="text-sm text-indigo-600 font-medium hover:underline">+ 新增固定時段</button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            {slots.map(slot => (
                                <div key={slot.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Clock size={16} className="text-indigo-500"/>
                                        <span className="font-bold text-slate-700">週{['日','一','二','三','四','五','六'][slot.weekday]} {slot.time_slot}</span>
                                    </div>
                                    {slot.note && <p className="text-sm text-slate-500">{slot.note}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                     <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">歷史上課列表</h3>
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500">
                                <tr>
                                    <th className="px-4 py-2">日期</th>
                                    <th className="px-4 py-2">時段</th>
                                    <th className="px-4 py-2">狀態</th>
                                    <th className="px-4 py-2">老師</th>
                                    <th className="px-4 py-2">備註</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sessions.map(s => (
                                    <tr key={s.id} className="border-b border-slate-100 last:border-0">
                                        <td className="px-4 py-3">{s.session_date}</td>
                                        <td className="px-4 py-3">{s.time_slot}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded text-xs ${s.attendance === AttendanceStatus.PRESENT ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                {s.attendance}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">{s.teacher_name}</td>
                                        <td className="px-4 py-3 text-slate-500">{s.note}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

             {/* Payments Tab */}
             {activeTab === 'payments' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">日期 (建立/付款)</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">項目/堂數</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">金額</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">狀態</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">方式</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">發票</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {payments.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 text-sm">
                                        <div className="text-slate-900">{p.created_at}</div>
                                        <div className="text-xs text-slate-500">{p.paid_at || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <div className="text-slate-900">{p.sessions_count ? `${p.sessions_count} 堂課` : '其他'}</div>
                                        {p.note && <div className="text-xs text-slate-500">{p.note}</div>}
                                    </td>
                                    <td className="px-6 py-4 font-mono font-medium text-slate-700">
                                        ${p.amount.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            p.status === PaymentStatus.PAID ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                        }`}>
                                            {p.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{p.method}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{p.invoice_no || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Assessments Tab */}
            {activeTab === 'assessments' && (
                <div className="space-y-8">
                    {assessments.map((a, index) => {
                        // Prepare data for Chart
                        const chartData = Object.keys(a.metrics).map(key => ({
                            name: key,
                            score: a.metrics[key]
                        }));

                        return (
                            <div key={a.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                                <div className="flex flex-col md:flex-row gap-6">
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-800">{a.scoring_system} 檢測</h3>
                                                <p className="text-sm text-slate-500">檢測日期: {a.assessed_at}</p>
                                            </div>
                                            <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded text-sm font-medium">
                                                #{assessments.length - index}
                                            </div>
                                        </div>
                                        
                                        <div className="bg-slate-50 p-4 rounded-lg mb-4">
                                            <h4 className="text-sm font-bold text-slate-700 mb-2">摘要總結</h4>
                                            <p className="text-slate-600 text-sm leading-relaxed">{a.summary}</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            {Object.entries(a.metrics).map(([key, value]) => (
                                                <div key={key} className="flex justify-between items-center border-b border-slate-100 pb-2">
                                                    <span className="text-sm text-slate-600">{key}</span>
                                                    <span className="font-mono font-bold text-slate-800">{String(value)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Chart Visualization */}
                                    <div className="w-full md:w-1/3 h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="name" tick={{fontSize: 12}} />
                                                <YAxis />
                                                <Tooltip />
                                                <Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    </div>
  );
};
