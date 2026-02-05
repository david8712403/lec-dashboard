import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SkillRunnerService {
  constructor(private readonly prisma: PrismaService) {}

  async run(action: string, args: Record<string, unknown>) {
    switch (action) {
      case 'add_student':
        return this.addStudent(args);
      case 'get_student':
        return this.getStudent(args);
      case 'list_students':
        return this.listStudents(args);
      case 'update_student':
        return this.updateStudent(args);
      case 'add_schedule':
        return this.addSchedule(args);
      case 'get_student_schedules':
        return this.getStudentSchedules(args);
      case 'get_weekly_schedule':
        return this.getWeeklySchedule(args);
      case 'delete_schedule':
        return this.deleteSchedule(args);
      case 'add_attendance':
        return this.addAttendance(args);
      case 'add_leave':
        return this.addLeave(args);
      case 'get_attendance':
        return this.getAttendance(args);
      case 'get_leaves':
        return this.getLeaves(args);
      case 'add_class_note':
        return this.addClassNote(args);
      case 'add_assessment':
        return this.addAssessment(args);
      case 'get_assessments':
        return this.getAssessments(args);
      case 'get_latest_assessment':
        return this.getLatestAssessment(args);
      case 'compare_assessments':
        return this.compareAssessments(args);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private async addStudent(args: Record<string, unknown>) {
    const name = String(args.name ?? '').trim();
    if (!name) throw new Error('缺少學員姓名。');
    const birthdate = this.parseDateInput(args.birthdate as string | undefined);
    const student = await this.prisma.student.create({
      data: {
        id: randomUUID(),
        name,
        birthday: birthdate,
        type: (args.type as string | undefined) ?? 'b一般',
        status: (args.status as string | undefined) ?? '檢測中',
        tags: [],
      },
    });
    return { student_id: student.id };
  }

  private async getStudent(args: Record<string, unknown>) {
    const name = String(args.name ?? '').trim();
    if (!name) return [];
    const students = await this.prisma.student.findMany({
      where: { name: { contains: name } },
      orderBy: { created_at: 'desc' },
    });
    return students.map((student) => ({
      id: student.id,
      name: student.name,
      birthdate: student.birthday ? this.formatDate(student.birthday) : null,
      type: student.type,
      status: student.status,
      created_at: student.created_at,
    }));
  }

  private async listStudents(args: Record<string, unknown>) {
    const status = args.status as string | undefined;
    const students = await this.prisma.student.findMany({
      where: status ? { status } : undefined,
      orderBy: { name: 'asc' },
    });
    return students.map((student) => ({
      id: student.id,
      name: student.name,
      birthdate: student.birthday ? this.formatDate(student.birthday) : null,
      type: student.type,
      status: student.status,
    }));
  }

  private async updateStudent(args: Record<string, unknown>) {
    const studentId = String(args.student_id ?? '').trim();
    if (!studentId) throw new Error('缺少 student_id。');
    const data: Record<string, any> = {};
    if (args.name !== undefined) data.name = args.name;
    if (args.birthdate !== undefined) data.birthday = this.parseDateInput(args.birthdate as string);
    if (args.type !== undefined) data.type = args.type;
    if (args.status !== undefined) data.status = args.status;
    await this.prisma.student.update({ where: { id: studentId }, data });
    return { updated: true };
  }

  private async addSchedule(args: Record<string, unknown>) {
    const student = await this.resolveStudent(args.student);
    const weekday = this.normalizeWeekday(args.weekday);
    const timeSlot = this.buildTimeSlot(args.start_time, args.end_time);
    const slot = await this.prisma.scheduleSlot.create({
      data: {
        id: randomUUID(),
        student_id: student.id,
        weekday,
        time_slot: timeSlot,
      },
    });
    return { schedule_id: slot.id };
  }

  private async getStudentSchedules(args: Record<string, unknown>) {
    const student = await this.resolveStudent(args.student);
    const slots = await this.prisma.scheduleSlot.findMany({
      where: { student_id: student.id },
      orderBy: [{ weekday: 'asc' }, { time_slot: 'asc' }],
    });
    return slots.map((slot) => {
      const { start, end } = this.splitTimeSlot(slot.time_slot);
      return {
        id: slot.id,
        weekday: slot.weekday,
        weekday_name: this.weekdayName(slot.weekday),
        start_time: start,
        end_time: end,
        student_name: student.name,
      };
    });
  }

  private async getWeeklySchedule(args: Record<string, unknown>) {
    const weekday = args.weekday ? this.normalizeWeekday(args.weekday) : undefined;
    const slots = await this.prisma.scheduleSlot.findMany({
      where: weekday ? { weekday } : undefined,
      orderBy: [{ weekday: 'asc' }, { time_slot: 'asc' }],
      include: { student: true },
    });
    return slots.map((slot) => {
      const { start, end } = this.splitTimeSlot(slot.time_slot);
      return {
        id: slot.id,
        weekday: slot.weekday,
        weekday_name: this.weekdayName(slot.weekday),
        start_time: start,
        end_time: end,
        student_name: slot.student.name,
        student_type: slot.student.type,
      };
    });
  }

  private async deleteSchedule(args: Record<string, unknown>) {
    const scheduleId = String(args.schedule_id ?? '').trim();
    if (!scheduleId) throw new Error('缺少 schedule_id。');
    await this.prisma.scheduleSlot.delete({ where: { id: scheduleId } });
    return { deleted: true };
  }

  private async addAttendance(args: Record<string, unknown>) {
    const student = await this.resolveStudent(args.student);
    const sessionDate = this.parseDateInput(args.class_date as string);
    if (!sessionDate) throw new Error('無效的上課日期。');
    const timeSlot = this.buildTimeSlot(args.start_time, args.end_time);
    const content = this.buildAttendanceContent(args);
    const session = await this.prisma.session.create({
      data: {
        id: randomUUID(),
        student_id: student.id,
        session_date: sessionDate,
        time_slot: timeSlot,
        attendance: (args.status as string | undefined) ?? '出席',
        performance_log: content ? JSON.stringify(content, null, 2) : null,
        note: (args.notes as string | undefined) ?? null,
      },
    });
    return { attendance_id: session.id };
  }

  private async addLeave(args: Record<string, unknown>) {
    const student = await this.resolveStudent(args.student);
    const leaveDate = this.parseDateInput(args.leave_date as string);
    if (!leaveDate) throw new Error('無效的請假日期。');
    const session = await this.prisma.session.create({
      data: {
        id: randomUUID(),
        student_id: student.id,
        session_date: leaveDate,
        time_slot: '請假',
        attendance: '請假',
        note: (args.reason as string | undefined) ?? null,
      },
    });
    return { leave_id: session.id };
  }

  private async getAttendance(args: Record<string, unknown>) {
    const student = await this.resolveStudent(args.student);
    const startDate = this.parseDateInput(args.start_date as string | undefined);
    const endDate = this.parseDateInput(args.end_date as string | undefined);

    const sessions = await this.prisma.session.findMany({
      where: {
        student_id: student.id,
        session_date: {
          gte: startDate ?? undefined,
          lte: endDate ?? undefined,
        },
      },
      orderBy: [{ session_date: 'desc' }, { time_slot: 'asc' }],
    });

    return sessions.map((session) => {
      const { start, end } = this.splitTimeSlot(session.time_slot);
      const parsed = this.parseAttendanceContent(session.performance_log);
      return {
        id: session.id,
        date: this.formatDate(session.session_date),
        start_time: start,
        end_time: end,
        status: session.attendance,
        visual: parsed?.visual ?? null,
        auditory: parsed?.auditory ?? null,
        motor: parsed?.motor ?? null,
        notes: parsed?.notes ?? session.note ?? null,
        student_name: student.name,
      };
    });
  }

  private async getLeaves(args: Record<string, unknown>) {
    const student = await this.resolveStudent(args.student);
    const sessions = await this.prisma.session.findMany({
      where: {
        student_id: student.id,
        attendance: '請假',
      },
      orderBy: [{ session_date: 'desc' }],
    });
    return sessions.map((session) => ({
      id: session.id,
      leave_date: this.formatDate(session.session_date),
      reason: session.note ?? null,
      student_name: student.name,
    }));
  }

  private async addClassNote(args: Record<string, unknown>) {
    const student = await this.resolveStudent(args.student);
    const noteDate = this.parseDateInput(args.note_date as string);
    const noteType = String(args.note_type ?? '課程備註');
    const content = String(args.content ?? '').trim();
    if (!content) throw new Error('缺少備註內容。');

    const log = await this.prisma.activityLog.create({
      data: {
        id: randomUUID(),
        timestamp: noteDate ?? new Date(),
        category: '課程',
        action: noteType,
        description: content,
        user: student.name,
      },
    });
    return { note_id: log.id };
  }

  private async addAssessment(args: Record<string, unknown>) {
    const student = await this.resolveStudent(args.student);
    const assessedAt = this.parseDateInput(args.assessment_date as string);
    if (!assessedAt) throw new Error('無效的檢測日期。');

    const metrics: Prisma.InputJsonObject = {
      visual_age: this.toNullableString(args.visual_age),
      auditory_age: this.toNullableString(args.auditory_age),
      motor_age: this.toNullableString(args.motor_age),
      visual_ratio: this.toNullableString(args.visual_ratio),
      auditory_ratio: this.toNullableString(args.auditory_ratio),
      motor_ratio: this.toNullableString(args.motor_ratio),
      academic_ratio: this.toNullableString(args.academic_ratio),
      notes: this.toNullableString(args.notes),
    };

    const assessment = await this.prisma.assessment.create({
      data: {
        id: randomUUID(),
        student_id: student.id,
        assessed_at: assessedAt,
        scoring_system: 'LEC-Standard',
        summary: (args.assessment_type as string | undefined) ?? null,
        metrics,
      },
    });

    return { assessment_id: assessment.id };
  }

  private async getAssessments(args: Record<string, unknown>) {
    const student = await this.resolveStudent(args.student);
    const assessments = await this.prisma.assessment.findMany({
      where: { student_id: student.id },
      orderBy: { assessed_at: 'desc' },
    });
    return assessments.map((item) => this.formatAssessment(item));
  }

  private async getLatestAssessment(args: Record<string, unknown>) {
    const student = await this.resolveStudent(args.student);
    const assessment = await this.prisma.assessment.findFirst({
      where: { student_id: student.id },
      orderBy: { assessed_at: 'desc' },
    });
    return assessment ? [this.formatAssessment(assessment)] : [];
  }

  private async compareAssessments(args: Record<string, unknown>) {
    const student = await this.resolveStudent(args.student);
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
    const lastMetrics = (last.metrics ?? {}) as Record<string, any>;

    return {
      student: student.name,
      from: this.formatDate(first.assessed_at),
      to: this.formatDate(last.assessed_at),
      visual_diff_months: this.compareAge(firstMetrics.visual_age, lastMetrics.visual_age),
      auditory_diff_months: this.compareAge(firstMetrics.auditory_age, lastMetrics.auditory_age),
      motor_diff_months: this.compareAge(firstMetrics.motor_age, lastMetrics.motor_age),
    };
  }

  private async resolveStudent(input: unknown) {
    const value = String(input ?? '').trim();
    if (!value) throw new Error('缺少學員名稱或 ID。');
    const byId = await this.prisma.student.findUnique({ where: { id: value } });
    if (byId) return byId;
    const byName = await this.prisma.student.findFirst({
      where: { name: { contains: value } },
      orderBy: { created_at: 'desc' },
    });
    if (!byName) throw new Error(`找不到學員: ${value}`);
    return byName;
  }

  private normalizeWeekday(value: unknown) {
    if (value === undefined || value === null) return 1;
    const text = String(value);
    const weekdayMap: Record<string, number> = {
      '一': 1,
      '二': 2,
      '三': 3,
      '四': 4,
      '五': 5,
      '六': 6,
      '日': 7,
      '天': 7,
      '週一': 1,
      '週二': 2,
      '週三': 3,
      '週四': 4,
      '週五': 5,
      '週六': 6,
      '週日': 7,
      '星期一': 1,
      '星期二': 2,
      '星期三': 3,
      '星期四': 4,
      '星期五': 5,
      '星期六': 6,
      '星期日': 7,
    };
    if (weekdayMap[text] !== undefined) return weekdayMap[text];
    const numeric = Number(text);
    if (!Number.isNaN(numeric)) {
      if (numeric >= 0 && numeric <= 6) return numeric + 1;
      if (numeric >= 1 && numeric <= 7) return numeric;
    }
    return 1;
  }

  private buildTimeSlot(start: unknown, end: unknown) {
    const normalizedStart = this.normalizeTime(start);
    const normalizedEnd = end ? this.normalizeTime(end) : this.inferEndTime(normalizedStart);
    return `${normalizedStart} - ${normalizedEnd}`;
  }

  private normalizeTime(value: unknown) {
    const text = String(value ?? '').trim();
    if (!text) return '00:00';
    if (text.includes(':')) return text;
    if (text.length === 4) return `${text.slice(0, 2)}:${text.slice(2)}`;
    return text;
  }

  private inferEndTime(startTime: string) {
    const [hour, minute] = startTime.split(':').map((v) => Number(v));
    if (Number.isNaN(hour) || Number.isNaN(minute)) return startTime;
    let endHour = hour + 1;
    let endMinute = minute + 40;
    if (endMinute >= 60) {
      endHour += 1;
      endMinute -= 60;
    }
    return `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
  }

  private splitTimeSlot(timeSlot: string) {
    const parts = timeSlot.split('-').map((part) => part.trim());
    return {
      start: parts[0] ?? timeSlot,
      end: parts[1] ?? '',
    };
  }

  private weekdayName(weekday: number) {
    const names = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];
    return names[weekday - 1] ?? `週${weekday}`;
  }

  private parseDateInput(value?: string | null) {
    if (!value) return null;
    const text = String(value).trim();
    if (!text) return null;

    const today = new Date();
    const midnight = (date: Date) =>
      new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (['今天', 'today'].includes(text)) return midnight(today);
    if (['明天', 'tomorrow'].includes(text)) {
      const d = new Date(today);
      d.setDate(d.getDate() + 1);
      return midnight(d);
    }
    if (['昨天', 'yesterday'].includes(text)) {
      const d = new Date(today);
      d.setDate(d.getDate() - 1);
      return midnight(d);
    }

    if (text.includes('下週') || text.includes('上週')) {
      const weekday = this.extractWeekday(text);
      if (weekday) {
        const todayIndex = (today.getDay() + 6) % 7;
        const targetIndex = weekday - 1;
        if (text.includes('下週')) {
          let daysAhead = targetIndex - todayIndex;
          if (daysAhead <= 0) daysAhead += 7;
          daysAhead += 7;
          const d = new Date(today);
          d.setDate(d.getDate() + daysAhead);
          return midnight(d);
        }
        if (text.includes('上週')) {
          let daysBack = todayIndex - targetIndex;
          if (daysBack <= 0) daysBack += 7;
          daysBack += 7;
          const d = new Date(today);
          d.setDate(d.getDate() - daysBack);
          return midnight(d);
        }
      }
    }

    let normalized = text.replace(/\//g, '-');
    const parts = normalized.split('-').map((part) => part.trim());
    if (parts.length === 2) {
      normalized = `${today.getFullYear()}-${parts[0]}-${parts[1]}`;
    }

    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return null;
    return midnight(date);
  }

  private extractWeekday(text: string) {
    const map: Record<string, number> = {
      '一': 1,
      '二': 2,
      '三': 3,
      '四': 4,
      '五': 5,
      '六': 6,
      '日': 7,
      '天': 7,
    };
    const match = text.match(/[一二三四五六日天]/);
    if (match && map[match[0]] !== undefined) return map[match[0]];
    return null;
  }

  private formatDate(date: Date) {
    return date.toISOString().split('T')[0];
  }

  private buildAttendanceContent(args: Record<string, unknown>) {
    const visual = args.visual as string | undefined;
    const auditory = args.auditory as string | undefined;
    const motor = args.motor as string | undefined;
    const notes = args.notes as string | undefined;
    if (!visual && !auditory && !motor && !notes) return null;
    return { visual, auditory, motor, notes };
  }

  private parseAttendanceContent(raw?: string | null) {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return { notes: raw };
    }
  }

  private formatAssessment(item: any) {
    const metrics = (item.metrics ?? {}) as Record<string, any>;
    return {
      id: item.id,
      assessment_date: this.formatDate(item.assessed_at),
      assessment_type: item.summary ?? null,
      visual_age: metrics.visual_age ?? null,
      auditory_age: metrics.auditory_age ?? null,
      motor_age: metrics.motor_age ?? null,
      visual_ratio: metrics.visual_ratio ?? null,
      auditory_ratio: metrics.auditory_ratio ?? null,
      motor_ratio: metrics.motor_ratio ?? null,
      academic_ratio: metrics.academic_ratio ?? null,
      notes: metrics.notes ?? null,
    };
  }

  private compareAge(first?: string, last?: string) {
    const toMonths = (value?: string) => {
      if (!value) return null;
      const parts = String(value).split('-').map((v) => Number(v));
      if (parts.length !== 2 || parts.some((p) => Number.isNaN(p))) return null;
      return parts[0] * 12 + parts[1];
    };
    const firstMonths = toMonths(first);
    const lastMonths = toMonths(last);
    if (firstMonths == null || lastMonths == null) return null;
    return lastMonths - firstMonths;
  }

  private toNullableString(value: unknown) {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    return text === '' ? null : text;
  }
}
