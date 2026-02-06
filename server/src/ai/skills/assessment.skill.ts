import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveStudent, parseDateInput, formatDate, toNullableString } from './helpers';

@Injectable()
export class AssessmentSkill {
  constructor(private readonly prisma: PrismaService) {}

  async run(action: string, args: Record<string, unknown>) {
    switch (action) {
      case 'add_assessment':          return this.addAssessment(args);
      case 'get_assessments':         return this.getAssessments(args);
      case 'get_latest_assessment':   return this.getLatestAssessment(args);
      case 'compare_assessments':     return this.compareAssessments(args);
      default: throw new Error(`AssessmentSkill: unknown action "${action}"`);
    }
  }

  private async addAssessment(args: Record<string, unknown>) {
    const student = await resolveStudent(this.prisma, args.student);
    const assessedAt = parseDateInput(args.assessment_date as string || args.assessed_at as string);
    if (!assessedAt) throw new Error('無效的檢測日期。');

    // Stars is now a separate field (0-5, default 0)
    const stars = args.stars !== undefined ? Math.max(0, Math.min(5, Number(args.stars))) : 0;

    // New metrics structure (with backward compatibility for old fields)
    const metrics: Prisma.InputJsonObject = {
      // NEW: Ability text fields
      visual_ability:      toNullableString(args.visual_ability),
      auditory_ability:    toNullableString(args.auditory_ability),
      motor_ability:       toNullableString(args.motor_ability),

      // Ratio percentages (support both number and string input)
      visual_ratio:        args.visual_ratio !== undefined ? Number(args.visual_ratio) : null,
      auditory_ratio:      args.auditory_ratio !== undefined ? Number(args.auditory_ratio) : null,
      motor_ratio:         args.motor_ratio !== undefined ? Number(args.motor_ratio) : null,
      academic_ratio:      args.academic_ratio !== undefined ? Number(args.academic_ratio) : null,

      // NEW: Course type (moved from Student)
      course_type:         toNullableString(args.course_type),

      // NEW: Professional notes
      professional_notes:  toNullableString(args.professional_notes || args.notes),

      // BACKWARD COMPATIBILITY: Keep old age fields
      visual_age:          toNullableString(args.visual_age),
      auditory_age:        toNullableString(args.auditory_age),
      motor_age:           toNullableString(args.motor_age),
    };

    const assessment = await this.prisma.assessment.create({
      data: {
        id: randomUUID(),
        student_id: student.id,
        assessed_at: assessedAt,
        scoring_system: (args.scoring_system as string | undefined) ?? 'LEC-Standard',
        summary: (args.assessment_type as string | undefined) ?? (args.summary as string | undefined) ?? null,
        status: (args.status as string | undefined) ?? '未測驗',
        stars,
        metrics,
      },
    });
    return { assessment_id: assessment.id };
  }

  private async getAssessments(args: Record<string, unknown>) {
    const student = await resolveStudent(this.prisma, args.student);
    const assessments = await this.prisma.assessment.findMany({
      where: { student_id: student.id },
      orderBy: { assessed_at: 'desc' },
    });
    return assessments.map((item) => this.formatAssessment(item));
  }

  private async getLatestAssessment(args: Record<string, unknown>) {
    const student = await resolveStudent(this.prisma, args.student);
    const assessment = await this.prisma.assessment.findFirst({
      where: { student_id: student.id },
      orderBy: { assessed_at: 'desc' },
    });
    return assessment ? [this.formatAssessment(assessment)] : [];
  }

  private async compareAssessments(args: Record<string, unknown>) {
    const student = await resolveStudent(this.prisma, args.student);
    const assessments = await this.prisma.assessment.findMany({
      where: { student_id: student.id },
      orderBy: { assessed_at: 'asc' },
    });
    if (assessments.length < 2) {
      return { message: '檢測紀錄不足，無法比較。' };
    }
    const first = assessments[0];
    const last = assessments[assessments.length - 1];
    const firstMetrics = (first.metrics ?? {}) as Record<string, any>;
    const lastMetrics  = (last.metrics  ?? {}) as Record<string, any>;

    return {
      student: student.name,
      from: formatDate(first.assessed_at),
      to:   formatDate(last.assessed_at),
      visual_diff_months:   this.compareAge(firstMetrics.visual_age,   lastMetrics.visual_age),
      auditory_diff_months: this.compareAge(firstMetrics.auditory_age, lastMetrics.auditory_age),
      motor_diff_months:    this.compareAge(firstMetrics.motor_age,    lastMetrics.motor_age),
    };
  }

  private formatAssessment(item: any) {
    const metrics = (item.metrics ?? {}) as Record<string, any>;
    return {
      id: item.id,
      assessment_date:     formatDate(item.assessed_at),
      assessment_type:     item.summary ?? null,
      status:              item.status ?? null,
      stars:               item.stars ?? 0,  // Now from top-level field
      // NEW fields
      visual_ability:      metrics.visual_ability      ?? null,
      auditory_ability:    metrics.auditory_ability    ?? null,
      motor_ability:       metrics.motor_ability       ?? null,
      course_type:         metrics.course_type         ?? null,
      professional_notes:  metrics.professional_notes  ?? null,
      // Ratios
      visual_ratio:        metrics.visual_ratio        ?? null,
      auditory_ratio:      metrics.auditory_ratio      ?? null,
      motor_ratio:         metrics.motor_ratio         ?? null,
      academic_ratio:      metrics.academic_ratio      ?? null,
      // OLD fields (backward compatibility)
      visual_age:          metrics.visual_age          ?? null,
      auditory_age:        metrics.auditory_age        ?? null,
      motor_age:           metrics.motor_age           ?? null,
      notes:               metrics.notes               ?? null,
    };
  }

  private compareAge(first?: string, last?: string): number | null {
    const toMonths = (value?: string) => {
      if (!value) return null;
      const parts = String(value).split('-').map((v) => Number(v));
      if (parts.length !== 2 || parts.some((p) => Number.isNaN(p))) return null;
      return parts[0] * 12 + parts[1];
    };
    const firstMonths = toMonths(first);
    const lastMonths  = toMonths(last);
    if (firstMonths == null || lastMonths == null) return null;
    return lastMonths - firstMonths;
  }
}
