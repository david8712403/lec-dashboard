import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { AssessmentHelperService } from './assessment-helper.service';

const toDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const parseTimeSlot = (value?: string | null) => {
  if (!value) return null;
  const normalized = String(value).replace(/\s/g, '');
  const [start, end] = normalized.split('-');
  if (!start) return null;
  return { start, end: end || start };
};

const resolveTimeRange = (payload: any) => {
  if (payload?.start_time && payload?.end_time) {
    return { start: payload.start_time, end: payload.end_time };
  }
  const parsed = parseTimeSlot(payload?.time_slot);
  if (parsed) return { start: parsed.start, end: parsed.end };
  throw new Error('缺少時段起訖時間。');
};

const formatDate = (value?: Date | null) =>
  value ? value.toISOString().split('T')[0] : undefined;

const formatDateTime = (value?: Date | null) =>
  value ? value.toISOString() : undefined;

const parseDateParts = (value?: string | null) => {
  if (!value) return null;
  const parts = value.split('-').map((part) => Number(part));
  if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return null;
  const year = parts[0];
  const month = parts[1] - 1;
  const day = parts[2] ? parts[2] : 1;
  return { year, month, day };
};

const toUtcDateFromLocalDateString = (value?: string | null) => {
  const parts = parseDateParts(value);
  if (!parts) return null;
  return new Date(Date.UTC(parts.year, parts.month, parts.day));
};

const getWeekStartUtcFromAnchor = (anchorUtc: Date, offsetMinutes = 0) => {
  const offsetMs = offsetMinutes * 60 * 1000;
  const localMs = anchorUtc.getTime() - offsetMs;
  const localDate = new Date(localMs);
  const day = localDate.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(
    Date.UTC(
      localDate.getUTCFullYear(),
      localDate.getUTCMonth(),
      localDate.getUTCDate() + diff,
    ),
  );
};

@Injectable()
export class DataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assessmentHelper: AssessmentHelperService,
  ) {}

  async listStudents() {
    const students = await this.prisma.student.findMany();
    return students.map((student) => ({
      ...student,
      birthday: formatDate(student.birthday),
      created_at: formatDate(student.created_at),
      tags: Array.isArray(student.tags) ? student.tags : [],
    }));
  }

  async createStudent(payload: any) {
    return this.prisma.student.create({
      data: {
        id: randomUUID(),
        name: payload.name,
        phone: payload.phone ?? null,
        birthday: toDate(payload.birthday),
        gender: payload.gender ?? null,
        type: payload.type ?? null,
        course_type: payload.course_type ?? null,
        grade: payload.grade ?? null,
        default_fee: payload.default_fee ?? null,
        status: payload.status ?? '待檢測',
        tags: payload.tags ?? [],
      },
    });
  }

  async updateStudent(id: string, payload: any) {
    const data: Record<string, any> = {};
    if (payload.name !== undefined) data.name = payload.name;
    if (payload.phone !== undefined) data.phone = payload.phone;
    if (payload.birthday !== undefined) data.birthday = toDate(payload.birthday);
    if (payload.gender !== undefined) data.gender = payload.gender;
    if (payload.type !== undefined) data.type = payload.type;
    if (payload.course_type !== undefined) data.course_type = payload.course_type;
    if (payload.grade !== undefined) data.grade = payload.grade;
    if (payload.default_fee !== undefined) data.default_fee = payload.default_fee;
    if (payload.status !== undefined) data.status = payload.status;
    if (payload.tags !== undefined) data.tags = payload.tags;

    return this.prisma.student.update({ where: { id }, data });
  }

  async deleteStudent(id: string) {
    return this.prisma.$transaction([
      this.prisma.scheduleSlot.deleteMany({ where: { student_id: id } }),
      this.prisma.session.deleteMany({ where: { student_id: id } }),
      this.prisma.payment.deleteMany({ where: { student_id: id } }),
      this.prisma.assessment.deleteMany({ where: { student_id: id } }),
      this.prisma.student.delete({ where: { id } }),
    ]);
  }

  async listSlots() {
    const slots = await this.prisma.scheduleSlot.findMany();
    return slots.map((slot) => ({
      ...slot,
      effective_from: formatDate(slot.effective_from),
    }));
  }

  async createSlot(payload: any) {
    const { start, end } = resolveTimeRange(payload);
    return this.prisma.scheduleSlot.create({
      data: {
        id: randomUUID(),
        student_id: payload.student_id,
        weekday: Number(payload.weekday),
        start_time: start,
        end_time: end,
        note: payload.note ?? null,
        effective_from: toDate(payload.effective_from),
      },
    });
  }

  async updateSlot(id: string, payload: any) {
    const data: Record<string, any> = {};
    if (payload.student_id !== undefined) data.student_id = payload.student_id;
    if (payload.weekday !== undefined) data.weekday = Number(payload.weekday);
    if (payload.start_time !== undefined) data.start_time = payload.start_time;
    if (payload.end_time !== undefined) data.end_time = payload.end_time;
    if (payload.time_slot !== undefined) {
      const parsed = parseTimeSlot(payload.time_slot);
      if (parsed) {
        data.start_time = parsed.start;
        data.end_time = parsed.end;
      }
    }
    if (payload.note !== undefined) data.note = payload.note;
    if (payload.effective_from !== undefined) data.effective_from = toDate(payload.effective_from);

    return this.prisma.scheduleSlot.update({ where: { id }, data });
  }

  async deleteSlot(id: string) {
    return this.prisma.scheduleSlot.delete({ where: { id } });
  }

  async listSessions() {
    const sessions = await this.prisma.session.findMany();
    return sessions.map((session) => ({
      ...session,
      session_date: formatDate(session.session_date),
    }));
  }

  async createSession(payload: any) {
    const { start, end } = resolveTimeRange(payload);
    return this.prisma.session.create({
      data: {
        id: randomUUID(),
        student_id: payload.student_id,
        session_date: toDate(payload.session_date) ?? new Date(),
        start_time: start,
        end_time: end,
        attendance: payload.attendance ?? '未登記',
        teacher_name: payload.teacher_name ?? null,
        note: payload.note ?? null,
        performance_log: payload.performance_log ?? null,
        pc_summary: payload.pc_summary ?? null,
        attachments: payload.attachments ?? null,
      },
    });
  }

  async updateSession(id: string, payload: any) {
    const data: Record<string, any> = {};
    if (payload.student_id !== undefined) data.student_id = payload.student_id;
    if (payload.session_date !== undefined) data.session_date = toDate(payload.session_date);
    if (payload.start_time !== undefined) data.start_time = payload.start_time;
    if (payload.end_time !== undefined) data.end_time = payload.end_time;
    if (payload.time_slot !== undefined) {
      const parsed = parseTimeSlot(payload.time_slot);
      if (parsed) {
        data.start_time = parsed.start;
        data.end_time = parsed.end;
      }
    }
    if (payload.attendance !== undefined) data.attendance = payload.attendance;
    if (payload.teacher_name !== undefined) data.teacher_name = payload.teacher_name;
    if (payload.note !== undefined) data.note = payload.note;
    if (payload.performance_log !== undefined) data.performance_log = payload.performance_log;
    if (payload.pc_summary !== undefined) data.pc_summary = payload.pc_summary;
    if (payload.attachments !== undefined) data.attachments = payload.attachments;

    return this.prisma.session.update({ where: { id }, data });
  }

  async deleteSession(id: string) {
    return this.prisma.session.delete({ where: { id } });
  }

  async createSessionsForWeek(payload: {
    week_start?: string;
    weekStart?: string;
    anchor_date?: string;
    anchorDate?: string;
    tz_offset?: number;
    tzOffset?: number;
  } = {}) {
    const offsetMinutes =
      Number(payload.tz_offset ?? payload.tzOffset ?? 0) || 0;
    const explicitWeekStart =
      toUtcDateFromLocalDateString(payload.week_start) ||
      toUtcDateFromLocalDateString(payload.weekStart);
    const anchor =
      explicitWeekStart ||
      toUtcDateFromLocalDateString(payload.anchor_date) ||
      toUtcDateFromLocalDateString(payload.anchorDate) ||
      new Date();

    const weekStart = explicitWeekStart ?? getWeekStartUtcFromAnchor(anchor, offsetMinutes);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
    weekEnd.setUTCHours(23, 59, 59, 999);

    const [slots, existingSessions] = await Promise.all([
      this.prisma.scheduleSlot.findMany({
        where: { student: { status: '進行中' } },
      }),
      this.prisma.session.findMany({
        where: {
          session_date: {
            gte: weekStart,
            lte: weekEnd,
          },
        },
      }),
    ]);

    const existingKeys = new Set(
      existingSessions.map((session) =>
        `${session.student_id}|${formatDate(session.session_date)}|${session.start_time}|${session.end_time}`,
      ),
    );

    const sessionsToCreate = slots
      .map((slot) => {
        const normalizedWeekday = slot.weekday === 0 ? 7 : slot.weekday;
        const date = new Date(weekStart);
        date.setUTCDate(weekStart.getUTCDate() + (normalizedWeekday - 1));
        const dateStr = formatDate(date);
        if (!dateStr) return null;
        const key = `${slot.student_id}|${dateStr}|${slot.start_time}|${slot.end_time}`;
        if (existingKeys.has(key)) return null;
        return {
          id: randomUUID(),
          student_id: slot.student_id,
          session_date: date,
          start_time: slot.start_time,
          end_time: slot.end_time,
          attendance: '未登記',
          teacher_name: null,
          note: null,
          performance_log: null,
          pc_summary: null,
          attachments: null,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    if (sessionsToCreate.length > 0) {
      await this.prisma.session.createMany({ data: sessionsToCreate });
    }

    return {
      createdCount: sessionsToCreate.length,
      weekStart: formatDate(weekStart),
      weekEnd: formatDate(weekEnd),
    };
  }

  async listPayments() {
    const payments = await this.prisma.payment.findMany();
    return payments.map((payment) => ({
      ...payment,
      paid_at: formatDate(payment.paid_at),
    }));
  }

  async createPayment(payload: any) {
    // Auto-calculate sessions_count if not provided
    let sessionsCount = payload.sessions_count;

    if (sessionsCount === undefined || sessionsCount === null) {
      sessionsCount = await this.assessmentHelper.getSessionsCountForStudent(payload.student_id);
    }

    return this.prisma.payment.create({
      data: {
        id: randomUUID(),
        student_id: payload.student_id,
        paid_at: toDate(payload.paid_at),
        amount: Number(payload.amount ?? 0),
        method: payload.method ?? '現金',  // Default to cash
        status: payload.status ?? '未繳',
        invoice_status: payload.invoice_status ?? null,
        invoice_no: payload.invoice_no ?? null,
        sessions_count: sessionsCount,
        month_ref: payload.month_ref ?? null,
        note: payload.note ?? null,
      },
    });
  }

  async updatePayment(id: string, payload: any) {
    const data: Record<string, any> = {};
    if (payload.student_id !== undefined) data.student_id = payload.student_id;
    if (payload.paid_at !== undefined) data.paid_at = toDate(payload.paid_at);
    if (payload.amount !== undefined) data.amount = Number(payload.amount);
    if (payload.method !== undefined) data.method = payload.method;
    if (payload.status !== undefined) data.status = payload.status;
    if (payload.invoice_status !== undefined) data.invoice_status = payload.invoice_status;
    if (payload.invoice_no !== undefined) data.invoice_no = payload.invoice_no;
    if (payload.sessions_count !== undefined) data.sessions_count = payload.sessions_count;
    if (payload.month_ref !== undefined) data.month_ref = payload.month_ref;
    if (payload.note !== undefined) data.note = payload.note;

    return this.prisma.payment.update({ where: { id }, data });
  }

  async deletePayment(id: string) {
    return this.prisma.payment.delete({ where: { id } });
  }

  async listAssessments() {
    const assessments = await this.prisma.assessment.findMany();
    return assessments.map((assessment) => ({
      ...assessment,
      assessed_at: formatDate(assessment.assessed_at),
      metrics: typeof assessment.metrics === 'string'
        ? JSON.parse(assessment.metrics)
        : (assessment.metrics ?? {}),
    }));
  }

  async listActivities() {
    const activities = await this.prisma.activityLog.findMany();
    return activities.map((activity) => ({
      ...activity,
      timestamp: formatDateTime(activity.timestamp),
    }));
  }

  async createAssessment(payload: any) {
    return this.prisma.assessment.create({
      data: {
        id: randomUUID(),
        student_id: payload.student_id,
        assessed_at: toDate(payload.assessed_at) ?? new Date(),
        scoring_system: payload.scoring_system ?? 'LEC-Standard',
        summary: payload.summary ?? null,
        status: payload.status ?? '未測驗',
        stars: payload.stars ?? 0,
        metrics: payload.metrics ?? {},
      },
    });
  }

  async updateAssessment(id: string, payload: any) {
    const data: Record<string, any> = {};
    if (payload.student_id !== undefined) data.student_id = payload.student_id;
    if (payload.assessed_at !== undefined) data.assessed_at = toDate(payload.assessed_at);
    if (payload.scoring_system !== undefined) data.scoring_system = payload.scoring_system;
    if (payload.summary !== undefined) data.summary = payload.summary;
    if (payload.status !== undefined) data.status = payload.status;
    if (payload.stars !== undefined) data.stars = payload.stars;
    if (payload.metrics !== undefined) data.metrics = payload.metrics;

    return this.prisma.assessment.update({ where: { id }, data });
  }

  async deleteAssessment(id: string) {
    return this.prisma.assessment.delete({ where: { id } });
  }
}
