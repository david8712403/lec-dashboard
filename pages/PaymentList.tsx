import React, { useState } from 'react';
import { MOCK_PAYMENTS, MOCK_STUDENTS } from '../services/mockData';
import { PaymentStatus } from '../types';
import { Filter, DollarSign, AlertCircle, Download } from 'lucide-react';

export const PaymentList: React.FC = () => {
    const [filter, setFilter] = useState<PaymentStatus | 'ALL'>('ALL');

    const payments = MOCK_PAYMENTS.map(p => ({
        ...p,
        studentName: MOCK_STUDENTS.find(s => s.id === p.student_id)?.name || 'Unknown'
    })).filter(p => filter === 'ALL' || p.status === filter);

    const totalUnpaid = payments
        .filter(p => p.status === PaymentStatus.UNPAID)
        .reduce((sum, p) => sum + p.amount, 0);

    return (
        <div className="p-8 max-w-7xl mx-auto">
             <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">繳費紀錄</h2>
                    <p className="text-slate-500 text-sm mt-1">追蹤所有應收帳款與發票紀錄</p>
                </div>
                 <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
                        <Download size={16}/> 匯出 CSV
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
                        <DollarSign size={16}/> 新增繳費
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 text-rose-600 mb-2">
                        <AlertCircle size={20} />
                        <span className="font-bold">目前未繳總額</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">${totalUnpaid.toLocaleString()}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-4 border-b border-slate-200 flex items-center gap-4">
                    <div className="flex items-center gap-2 text-slate-600">
                        <Filter size={18} />
                        <span className="text-sm font-medium">篩選狀態:</span>
                    </div>
                    <div className="flex gap-2">
                        {['ALL', PaymentStatus.UNPAID, PaymentStatus.PAID, PaymentStatus.CLOSED].map(status => (
                            <button
                                key={status}
                                onClick={() => setFilter(status as any)}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                    filter === status 
                                    ? 'bg-slate-800 text-white' 
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                {status === 'ALL' ? '全部' : status}
                            </button>
                        ))}
                    </div>
                </div>
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500">
                        <tr>
                            <th className="px-6 py-3 text-xs uppercase font-semibold">學生</th>
                            <th className="px-6 py-3 text-xs uppercase font-semibold">日期</th>
                            <th className="px-6 py-3 text-xs uppercase font-semibold">金額</th>
                            <th className="px-6 py-3 text-xs uppercase font-semibold">狀態</th>
                            <th className="px-6 py-3 text-xs uppercase font-semibold">方式</th>
                            <th className="px-6 py-3 text-xs uppercase font-semibold">備註</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {payments.map(p => (
                            <tr key={p.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium text-slate-900">{p.studentName}</td>
                                <td className="px-6 py-4 text-sm text-slate-600">{p.paid_at || p.created_at}</td>
                                <td className="px-6 py-4 font-mono font-medium">${p.amount.toLocaleString()}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                        p.status === PaymentStatus.UNPAID ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                                    }`}>
                                        {p.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600">{p.method}</td>
                                <td className="px-6 py-4 text-sm text-slate-500">{p.note || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
