
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Session, Student, AttendanceStatus, ActivityLogEntry } from '../types';
import { FileTextIcon, BotIcon, CameraIcon, XIcon, PlusIcon, ChevronLeftIcon } from './Icons';
import { useToast } from './Toast';

interface DailyLogManagerProps {
  sessions: Session[];
  students: Student[];
  apiBaseUrl?: string;
  onUpdateSession?: (id: string, payload: Partial<Session>) => Promise<void>;
  onLogActivity?: (category: '課程', action: string, description: string) => void;
  initialSessionId?: string;
}

export const DailyLogManager: React.FC<DailyLogManagerProps> = ({
  sessions,
  students,
  onUpdateSession,
  onLogActivity,
  initialSessionId,
}) => {
  const { toast } = useToast();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3004';
  const initialDate = sessions.length > 0 
    ? sessions.sort((a,b) => b.session_date.localeCompare(a.session_date))[0].session_date 
    : new Date().toISOString().split('T')[0];

  const [filterDate, setFilterDate] = useState(initialDate);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [editSession, setEditSession] = useState<Session | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const didInitRef = useRef(false);
  const savingRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const pendingRef = useRef<Partial<Session> | null>(null);
  const queuedFlushRef = useRef(false);
  const editSessionRef = useRef<Session | null>(null);
  const SAVE_DEBOUNCE_MS = 600;

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => s.session_date === filterDate);
  }, [sessions, filterDate]);

  const getStudent = (id: string) => students.find(s => s.id === id);

  useEffect(() => {
    const session = sessions.find(s => s.id === selectedSessionId);
    if (session) {
      setEditSession({ ...session });
    } else {
      setEditSession(null);
    }
  }, [selectedSessionId, sessions]);
  
  useEffect(() => {
    editSessionRef.current = editSession;
  }, [editSession]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!initialSessionId || didInitRef.current) return;
    const target = sessions.find((s) => s.id === initialSessionId);
    if (target) {
      setFilterDate(target.session_date);
      setSelectedSessionId(target.id);
      didInitRef.current = true;
      setTimeout(() => {
        const element = document.getElementById(`session-${target.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 120);
    }
  }, [initialSessionId, sessions]);

  const shiftDate = (days: number) => {
    const d = new Date(filterDate);
    d.setDate(d.getDate() + days);
    setFilterDate(d.toISOString().split('T')[0]);
    setSelectedSessionId(null);
  };

  const handleScanTrigger = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files) as File[];
    const readAsDataUrl = (file: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

    try {
      const base64Files = await Promise.all(fileArray.map(readAsDataUrl));
      if (editSession) {
        const currentAttachments = editSession.attachments || [];
        const nextAttachments = [...currentAttachments, ...base64Files];
        scheduleSave({ attachments: nextAttachments });
      }
    } catch (error) {
      console.error('Failed to read attachments:', error);
      toast('附件處理失敗，請稍後再試。', 'error');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    if (editSession && editSession.attachments) {
      const newAttachments = [...editSession.attachments];
      newAttachments.splice(index, 1);
      scheduleSave({ attachments: newAttachments });
    }
  };

  const buildUpdatePayload = (session: Session) => ({
    attendance: session.attendance,
    performance_log: session.performance_log,
    pc_summary: session.pc_summary,
    note: session.note,
    attachments: session.attachments,
    teacher_name: session.teacher_name,
    session_date: session.session_date,
    start_time: session.start_time,
    end_time: session.end_time,
  });

  const flushSave = async () => {
    const current = editSessionRef.current;
    if (!current) return;
    if (savingRef.current) {
      queuedFlushRef.current = true;
      return;
    }

    const pending = pendingRef.current;
    pendingRef.current = null;

    savingRef.current = true;
    setSaveStatus('saving');

    const merged = pending ? { ...current, ...pending } : current;
    editSessionRef.current = merged;
    setEditSession(merged);

    try {
      await onUpdateSession?.(merged.id, buildUpdatePayload(merged));
      if (onLogActivity) {
        const studentName = getStudent(merged.student_id)?.name;
        onLogActivity(
          '課程',
          '更新課堂紀錄',
          `修改了 ${studentName} 在 ${merged.session_date} (${merged.start_time}-${merged.end_time}) 的紀錄。`,
        );
      }
      setSaveStatus('saved');
      window.setTimeout(() => {
        setSaveStatus((status) => (status === 'saved' ? 'idle' : status));
      }, 1000);
    } catch (error) {
      console.error('Failed to update session:', error);
      setSaveStatus('error');
      toast('儲存失敗，請稍後再試。', 'error');
    } finally {
      savingRef.current = false;
      if (queuedFlushRef.current || pendingRef.current) {
        queuedFlushRef.current = false;
        void flushSave();
      }
    }
  };

  const scheduleSave = (next?: Partial<Session>) => {
    if (!editSession) return;
    const merged = { ...editSession, ...(pendingRef.current ?? {}), ...(next ?? {}) };
    setEditSession(merged);
    editSessionRef.current = merged;
    pendingRef.current = next ? { ...(pendingRef.current ?? {}), ...next } : pendingRef.current;
    setSaveStatus('saving');

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      void flushSave();
    }, SAVE_DEBOUNCE_MS);
  };

  const handleGenerateSummary = async () => {
    if (!editSession || !editSession.performance_log) {
      toast('請先填寫上課表現紀錄再產出摘要。', 'warning');
      return;
    }
    setIsGenerating(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `請根據以下特教課程的上課表現紀錄，產出一段專業的 PC 個案摘要，用於與家長或保母討論。\\n摘要應簡潔（約 100-200 字）、中肯，並包含今日觀察到的進步、待加強處以及具體的居家練習建議：\\n\\n上課表現紀錄：\\n${editSession.performance_log}`,
          history: [],
        }),
      });

      if (!response.ok) {
        throw new Error(`AI response error: ${response.status}`);
      }

      const data = await response.json();
      if (data.reply) {
        const summary = data.reply.trim();
        scheduleSave({ pc_summary: summary });
      }
    } catch (error) {
      console.error("AI Generation failed:", error);
      toast('AI 摘要生成失敗。', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const attendanceOptions = [
    { status: AttendanceStatus.PRESENT, label: '到課', color: 'bg-emerald-500' },
    { status: AttendanceStatus.ABSENT, label: '請假', color: 'bg-red-500' },
    { status: AttendanceStatus.MAKEUP, label: '補課', color: 'bg-purple-500' },
    { status: AttendanceStatus.CANCELED, label: '停課', color: 'bg-slate-500' },
  ];

  const updateField = (field: keyof Session, value: any) => {
    if (editSession) {
      setEditSession({ ...editSession, [field]: value });
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full gap-4">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" multiple onChange={handleFileChange} />

      {/* Sidebar - Date Selector */}
      <div className="w-full md:w-72 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col border border-slate-200 shrink-0">
         <div className="bg-slate-50/80 border-b p-4">
            <div className="flex items-center justify-between mb-3">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">日期選擇</span>
               <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                 {filteredSessions.length} 堂課
               </span>
            </div>
            <div className="flex items-center gap-2">
               <button onClick={() => shiftDate(-1)} className="p-2 hover:bg-white rounded-lg border border-slate-200 text-slate-500 transition-all">
                  <ChevronLeftIcon className="w-4 h-4" />
               </button>
               <input 
                 type="date" 
                 value={filterDate}
                 onChange={(e) => {
                   setFilterDate(e.target.value);
                   setSelectedSessionId(null);
                 }}
                 className="flex-1 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
               />
               <button onClick={() => shiftDate(1)} className="p-2 hover:bg-white rounded-lg border border-slate-200 text-slate-500 transition-all rotate-180">
                  <ChevronLeftIcon className="w-4 h-4" />
               </button>
            </div>
         </div>

         <div className="bg-slate-50/50 px-4 py-2 border-b text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            當日課表
         </div>
         <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
            {filteredSessions.length > 0 ? (
              filteredSessions.map(session => {
                 const student = getStudent(session.student_id);
                 const isSelected = session.id === selectedSessionId;
                 const currentAttendance = isSelected && editSession ? editSession.attendance : session.attendance;
                 
                 return (
                    <div 
                      key={session.id}
                      id={`session-${session.id}`}
                      onClick={() => setSelectedSessionId(session.id)}
                      className={`p-4 cursor-pointer transition-all hover:bg-indigo-50/30 ${isSelected ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : 'border-l-4 border-l-transparent'}`}
                    >
                       <div className="flex justify-between items-start mb-1.5">
                          <span className="font-bold text-slate-800 text-sm">{student?.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border
                            ${currentAttendance === AttendanceStatus.PRESENT ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                              currentAttendance === AttendanceStatus.ABSENT ? 'bg-red-50 text-red-700 border-red-100' :
                              currentAttendance === AttendanceStatus.MAKEUP ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                             {currentAttendance}
                          </span>
                       </div>
                       <div className="flex items-center gap-2 text-slate-400 font-medium">
                          <span className="text-[10px] font-mono bg-white border border-slate-100 px-1 rounded">{session.start_time}</span>
                          <span className="text-[10px] truncate uppercase tracking-tight">{session.teacher_name || '未指派'}</span>
                       </div>
                    </div>
                 );
              })
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center opacity-40">
                 <FileTextIcon className="w-10 h-10 mb-2" />
                 <p className="text-[10px] font-bold uppercase tracking-widest">本日暫無排課</p>
              </div>
            )}
         </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col min-h-0 overflow-hidden">
         {editSession ? (
            <>
               <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
                  <div>
                     <h2 className="text-lg font-bold text-slate-800">{getStudent(editSession.student_id)?.name} <span className="text-slate-400 font-normal mx-1">/</span> 課堂紀錄</h2>
                     <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{editSession.session_date} • {editSession.start_time}-{editSession.end_time}</p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto items-center">
                     {saveStatus !== 'idle' && (
                       <span
                         className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${
                           saveStatus === 'saving'
                             ? 'bg-amber-50 text-amber-700 border-amber-200'
                             : saveStatus === 'saved'
                             ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                             : 'bg-red-50 text-red-700 border-red-200'
                         }`}
                       >
                         {saveStatus === 'saving' ? '正在儲存' : saveStatus === 'saved' ? '已儲存' : '儲存失敗'}
                       </span>
                     )}
                     <button onClick={handleScanTrigger} className="flex-1 sm:flex-none px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                        <CameraIcon className="w-4 h-4" />
                        <span className="sm:inline">掃描附件</span>
                     </button>
                  </div>
               </div>
               
               <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8">
                  <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-100">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">出勤狀態快速登記</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {attendanceOptions.map((opt) => (
                        <button
                          key={opt.status}
                          className={`py-2 px-3 rounded-lg text-sm font-bold border transition-all flex items-center justify-center gap-2
                            ${editSession.attendance === opt.status 
                              ? `${opt.color} text-white border-transparent shadow-sm scale-[1.02]` 
                              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm'}`}
                          onClick={() => scheduleSave({ attendance: opt.status })}
                        >
                          <div className={`w-2 h-2 rounded-full ${editSession.attendance === opt.status ? 'bg-white' : opt.color}`}></div>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                     <label className="block text-sm font-bold text-slate-800 flex items-center gap-2">
                        <div className="w-1 h-3 bg-indigo-500 rounded-full"></div>
                        上課表現紀錄 (老師)
                     </label>
                     <textarea 
                        className="w-full h-32 p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm transition-all leading-relaxed"
                        placeholder="請詳細描述今日個案的表現、學習狀況或情緒反應..."
                        value={editSession.performance_log || ''}
                        onChange={(e) => updateField('performance_log', e.target.value)}
                        onBlur={() => scheduleSave()}
                     ></textarea>
                  </div>

                  <div className="space-y-3">
                     <label className="block text-sm font-bold text-slate-800 flex items-center gap-2">
                        <div className="w-1 h-3 bg-slate-400 rounded-full"></div>
                        課程行政備註 (行政)
                     </label>
                     <textarea 
                        className="w-full h-20 p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm transition-all bg-slate-50/30 font-medium"
                        placeholder="請輸入補課安排、請假原因或其他行政事項..."
                        value={editSession.note || ''}
                        onChange={(e) => updateField('note', e.target.value)}
                        onBlur={() => scheduleSave()}
                     ></textarea>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-end border-b pb-2 border-slate-100">
                       <label className="block text-sm font-bold text-slate-800">課堂附件歷程</label>
                       <button onClick={handleScanTrigger} className="text-[10px] text-indigo-600 font-black uppercase tracking-widest hover:text-indigo-700 flex items-center gap-1">
                         <PlusIcon className="w-3 h-3" /> 新增附件
                       </button>
                    </div>
                    {(!editSession.attachments || editSession.attachments.length === 0) ? (
                      <div className="py-10 border-2 border-dashed border-slate-100 rounded-xl flex flex-col items-center justify-center text-slate-300">
                         <CameraIcon className="w-8 h-8 mb-2 opacity-20" />
                         <span className="text-xs font-bold uppercase tracking-widest">暫無附件紀錄</span>
                      </div>
                    ) : (
                      <div className="flex gap-4 flex-wrap">
                          {editSession.attachments.map((data, idx) => (
                            <div key={idx} className="relative group w-24 h-24 border border-slate-200 rounded-xl overflow-hidden bg-slate-50 shadow-sm">
                               {data.startsWith('data:image') ? <img src={data} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><FileTextIcon className="w-8 h-8 text-slate-300" /></div>}
                               <button onClick={() => removeAttachment(idx)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-md">
                                  <XIcon className="w-3 h-3" />
                               </button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 space-y-4">
                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <label className="flex items-center gap-2 text-sm font-bold text-indigo-900">
                           <BotIcon className="w-5 h-5" />
                           PC 個案摘要 (家長溝通版)
                        </label>
                        <button 
                          onClick={handleGenerateSummary} 
                          disabled={isGenerating} 
                          className={`text-[10px] bg-white border border-indigo-200 text-indigo-600 px-3 py-1.5 rounded-lg font-black uppercase tracking-widest shadow-sm transition-all ${isGenerating ? 'opacity-50' : 'hover:bg-indigo-50'}`}
                        >
                           {isGenerating ? '正在生成摘要...' : '✨ 一鍵產出 PC 摘要'}
                        </button>
                     </div>
                     <textarea 
                        className="w-full h-40 p-4 border border-indigo-200 rounded-xl bg-white text-sm text-indigo-900/80 leading-relaxed font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        placeholder="AI 將根據上方老師的紀錄自動生成摘要..."
                        value={editSession.pc_summary || ''}
                        onChange={(e) => updateField('pc_summary', e.target.value)}
                        onBlur={() => scheduleSave()}
                     ></textarea>
                  </div>
               </div>
            </>
         ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-20 text-center">
               <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                 <FileTextIcon className="w-10 h-10 opacity-20" />
               </div>
               <p className="font-bold text-slate-600">請從左側列表選擇課堂</p>
               <p className="text-xs mt-2 text-slate-400 font-medium">您可以透過上方日期選單篩選不同的課程日期</p>
            </div>
         )}
      </div>
    </div>
  );
};
