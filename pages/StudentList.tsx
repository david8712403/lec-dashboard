import React, { useState } from 'react';
import { MOCK_STUDENTS } from '../services/mockData';
import { Student, StudentStatus } from '../types';
import { Search, Filter, Plus, ChevronRight } from 'lucide-react';

interface StudentListProps {
  onSelectStudent: (id: string) => void;
}

export const StudentList: React.FC<StudentListProps> = ({ onSelectStudent }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredStudents = MOCK_STUDENTS.filter(s => {
    const matchesSearch = s.name.includes(searchTerm) || s.phone?.includes(searchTerm);
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: StudentStatus) => {
    switch(status) {
        case StudentStatus.ACTIVE: return 'bg-emerald-100 text-emerald-800';
        case StudentStatus.PENDING: return 'bg-amber-100 text-amber-800';
        case StudentStatus.COMPLETED: return 'bg-blue-100 text-blue-800';
        default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
            <h2 className="text-2xl font-bold text-slate-900">個案管理</h2>
            <p className="text-slate-500 text-sm mt-1">管理所有學生、個案狀態與基本資料</p>
        </div>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-indigo-700 transition-colors">
            <Plus size={16} />
            新增個案
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
                type="text" 
                placeholder="搜尋姓名或電話..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
        </div>
        <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-400" />
            <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-slate-200 rounded-lg text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
                <option value="ALL">所有狀態</option>
                {Object.values(StudentStatus).map(s => (
                    <option key={s} value={s}>{s}</option>
                ))}
            </select>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">姓名 / 編號</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">狀態</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">類別</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">標籤</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">聯絡電話</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase"></th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {filteredStudents.map(student => (
                    <tr 
                        key={student.id} 
                        onClick={() => onSelectStudent(student.id)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors group"
                    >
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                                    {student.name[0]}
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">{student.name}</p>
                                    <p className="text-xs text-slate-500">ID: {student.id}</p>
                                </div>
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(student.status)}`}>
                                {student.status}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{student.type}</td>
                        <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                                {student.tags.map(tag => (
                                    <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded border border-slate-200">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 font-mono">{student.phone}</td>
                        <td className="px-6 py-4 text-right">
                            <ChevronRight className="text-slate-300 group-hover:text-indigo-500 inline-block" size={20} />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
        {filteredStudents.length === 0 && (
            <div className="p-8 text-center text-slate-500">
                沒有找到符合條件的個案。
            </div>
        )}
      </div>
    </div>
  );
};
