'use client'

import type { ChangeEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Assessment, CourseType, AssessmentStatus } from '@/types';
import { useToast } from './Toast';
import { API_BASE_URL } from '@/hooks/useDashboardData';
import { FileTextIcon, XIcon } from './Icons';

interface AssessmentModalProps {
  assessment?: Assessment | null;
  studentId: string;
  studentName?: string;
  onSubmitAssessment?: (payload: Partial<Assessment>, assessmentId?: string) => Promise<void>;
  onDeleteAssessment?: (assessmentId: string) => Promise<void>;
  onClose: () => void;
  onSave: () => void;
}

export function AssessmentModal({
  assessment,
  studentId,
  studentName,
  onSubmitAssessment,
  onDeleteAssessment,
  onClose,
  onSave,
}: AssessmentModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    visual_ability: '',
    auditory_ability: '',
    motor_ability: '',
    visual_ratio: 0,
    auditory_ratio: 0,
    motor_ratio: 0,
    academic_ratio: 0,
    course_type: CourseType.HUNDRED_TWO,
    professional_notes: '',
    stars: 0,
    status: AssessmentStatus.NOT_TESTED,
    assessed_at: new Date().toISOString().split('T')[0],
    pdf_attachment: '',
  });

  useEffect(() => {
    if (assessment) {
      setFormData({
        visual_ability: assessment.metrics?.visual_ability || assessment.metrics?.visual_age || '',
        auditory_ability: assessment.metrics?.auditory_ability || assessment.metrics?.auditory_age || '',
        motor_ability: assessment.metrics?.motor_ability || assessment.metrics?.motor_age || assessment.metrics?.kinetic_age || '',
        visual_ratio: assessment.metrics?.visual_ratio || 0,
        auditory_ratio: assessment.metrics?.auditory_ratio || 0,
        motor_ratio: assessment.metrics?.motor_ratio || 0,
        academic_ratio: assessment.metrics?.academic_ratio || 0,
        course_type: assessment.metrics?.course_type || CourseType.HUNDRED_TWO,
        professional_notes: assessment.metrics?.professional_notes || assessment.summary || '',
        stars: assessment.stars ?? 0,
        status: assessment.status || AssessmentStatus.NOT_TESTED,
        assessed_at: assessment.assessed_at || new Date().toISOString().split('T')[0],
        pdf_attachment: assessment.metrics?.pdf_attachment || '',
      });
    }
  }, [assessment]);

  const handlePdfUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({
        ...prev,
        pdf_attachment: reader.result as string,
      }));
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    try {
      const metrics = {
        visual_ability: formData.visual_ability,
        auditory_ability: formData.auditory_ability,
        motor_ability: formData.motor_ability,
        visual_ratio: formData.visual_ratio,
        auditory_ratio: formData.auditory_ratio,
        motor_ratio: formData.motor_ratio,
        academic_ratio: formData.academic_ratio,
        course_type: formData.course_type,
        professional_notes: formData.professional_notes,
        pdf_attachment: formData.pdf_attachment || undefined,
      };

      if (onSubmitAssessment) {
        const payload: Partial<Assessment> = {
          assessed_at: formData.assessed_at,
          status: formData.status,
          stars: formData.stars,
          metrics,
          summary: formData.professional_notes || undefined,
        };
        if (!assessment?.id) {
          payload.student_id = studentId;
          payload.scoring_system = 'LEC-Standard';
        }
        await onSubmitAssessment(payload, assessment?.id);
      } else if (assessment?.id) {
        const response = await fetch(`${API_BASE_URL}/api/assessments/${assessment.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metrics,
            stars: formData.stars,
            status: formData.status,
            assessed_at: formData.assessed_at,
            summary: formData.professional_notes || undefined,
          }),
        });

        if (!response.ok) throw new Error('更新失敗');
      } else {
        const response = await fetch(`${API_BASE_URL}/api/assessments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_id: studentId,
            assessed_at: formData.assessed_at,
            scoring_system: 'LEC-Standard',
            status: formData.status,
            stars: formData.stars,
            metrics,
            summary: formData.professional_notes || undefined,
          }),
        });

        if (!response.ok) throw new Error('新增失敗');
      }

      toast(assessment?.id ? '檢測記錄已更新' : '檢測記錄已新增', 'success');

      onSave();
      onClose();
    } catch (error) {
      console.error('Failed to save assessment:', error);
      toast('儲存失敗：' + (error as Error).message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!assessment?.id || !onDeleteAssessment) return;
    if (!confirm('確定要刪除此檢測報告嗎？')) return;
    try {
      await onDeleteAssessment(assessment.id);
      toast('檢測記錄已刪除', 'success');
      onClose();
    } catch (error) {
      console.error('Failed to delete assessment:', error);
      toast('刪除失敗：' + (error as Error).message, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-y-auto animate-in zoom-in-95 duration-200">
        <div className="sticky top-0 bg-slate-50/70 border-b px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-slate-800">
              {assessment?.id ? '編輯檢測報告' : '新增檢測報告'}
            </h2>
            {studentName && (
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                學生：{studentName}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-full text-slate-400"
            aria-label="Close"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="application/pdf"
            onChange={handlePdfUpload}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">檢測日期</label>
              <input
                type="date"
                value={formData.assessed_at}
                onChange={(e) => setFormData({ ...formData, assessed_at: e.target.value })}
                className="w-full p-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">狀態</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as AssessmentStatus })}
                className="w-full p-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              >
                <option value={AssessmentStatus.NOT_TESTED}>未測驗</option>
                <option value={AssessmentStatus.ANALYZING}>分析中</option>
                <option value={AssessmentStatus.CONSULTING}>待諮詢</option>
                <option value={AssessmentStatus.COMPLETED}>完成</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">課程類型</label>
              <select
                value={formData.course_type}
                onChange={(e) => setFormData({ ...formData, course_type: e.target.value as CourseType })}
                className="w-full p-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              >
                <option value={CourseType.HALF_ONE}>半1 (4堂)</option>
                <option value={CourseType.HUNDRED_TWO}>百2 (8堂)</option>
                <option value={CourseType.HUNDRED_THREE}>百3 (12堂)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">本次獲得星星數</label>
              <div className="flex items-center gap-2 p-2 border rounded-lg bg-white">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormData({ ...formData, stars: star })}
                    className={`text-2xl transition-colors ${star <= formData.stars ? 'text-amber-400' : 'text-slate-300'}`}
                  >
                    ★
                  </button>
                ))}
                <span className="ml-2 text-xs font-bold text-slate-500">{formData.stars} / 5</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">代表該次學生讓老師獲得的積分</p>
            </div>
          </div>

          <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-100">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">能力年齡</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">視覺能力</label>
                <input
                  type="text"
                  value={formData.visual_ability}
                  onChange={(e) => setFormData({ ...formData, visual_ability: e.target.value })}
                  placeholder="例: 7-7"
                  className="w-full p-2 border rounded-lg text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">聽語能力</label>
                <input
                  type="text"
                  value={formData.auditory_ability}
                  onChange={(e) => setFormData({ ...formData, auditory_ability: e.target.value })}
                  placeholder="例: 足"
                  className="w-full p-2 border rounded-lg text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">感覺動作</label>
                <input
                  type="text"
                  value={formData.motor_ability}
                  onChange={(e) => setFormData({ ...formData, motor_ability: e.target.value })}
                  placeholder="例: 技-"
                  className="w-full p-2 border rounded-lg text-sm bg-white"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">課程比例建議</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { key: 'visual_ratio', label: '視覺' },
                { key: 'auditory_ratio', label: '聽語' },
                { key: 'motor_ratio', label: '動作' },
                { key: 'academic_ratio', label: '學科' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={formData[key as keyof typeof formData]}
                    onChange={(e) =>
                      setFormData({ ...formData, [key]: parseInt(e.target.value) || 0 })
                    }
                    className="w-full p-2 border rounded-lg text-sm bg-white"
                  />
                  <span className="text-[10px] text-slate-400">
                    {(formData[key as keyof typeof formData] as number)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">專業評估內容</label>
              <textarea
                value={formData.professional_notes}
                onChange={(e) => setFormData({ ...formData, professional_notes: e.target.value })}
                rows={4}
                className="w-full p-3 border rounded-lg text-sm bg-white"
                placeholder="專業評估與課程建議..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">PDF 附件</label>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2"
                >
                  <FileTextIcon className="w-4 h-4" />
                  上傳 PDF
                </button>
                {formData.pdf_attachment ? (
                  <div className="flex items-center gap-2">
                    <a
                      href={formData.pdf_attachment}
                      download={`assessment-${studentName || studentId}.pdf`}
                      className="text-xs font-bold text-indigo-600 hover:underline"
                    >
                      已上傳，點此下載
                    </a>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, pdf_attachment: '' })}
                      className="text-xs font-bold text-red-500 hover:underline"
                    >
                      移除
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400">尚未上傳 PDF</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-slate-50/80 border-t px-6 py-4 flex justify-end gap-3">
          {assessment?.id && onDeleteAssessment && (
            <button
              onClick={handleDelete}
              className="px-4 py-2 border border-red-200 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 transition-all"
            >
              刪除
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
          >
            儲存
          </button>
        </div>
      </div>
    </div>
  );
}
