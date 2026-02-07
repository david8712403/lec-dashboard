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

  private getActor(user?: { name?: string; sub?: string }) {
    return {
      user: user?.name || user?.sub || 'Unknown',
      line_uid: user?.sub ?? null,
    };
  }

  private async logActivity(
    category: '個案' | '繳費' | '課程',
    action: string,
    description: string,
    user?: { name?: string; sub?: string },
  ) {
    const actor = this.getActor(user);
    try {
      await this.prisma.activityLog.create({
        data: {
          id: randomUUID(),
          timestamp: new Date(),
          category,
          action,
          description,
          user: actor.user,
          line_uid: actor.line_uid,
        },
      });
    } catch (error) {
      console.warn('Failed to write activity log:', error);
    }
  }

  async listStudents() {
    const students = await this.prisma.student.findMany();
    return students.map((student) => ({
      ...student,
      birthday: formatDate(student.birthday),
      created_at: formatDate(student.created_at),
      tags: Array.isArray(student.tags) ? student.tags : [],
    }));
  }

  async createStudent(payload: any, user?: { name?: string; sub?: string }) {
    const student = await this.prisma.student.create({
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
    await this.logActivity('個案', '新增個案', `新增個案 ${student.name}`, user);
    return student;
  }

  async updateStudent(id: string, payload: any, user?: { name?: string; sub?: string }) {
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

    const student = await this.prisma.student.update({ where: { id }, data });
    await this.logActivity('個案', '更新個案', `更新個案 ${student.name}`, user);
    return student;
  }

  async deleteStudent(id: string, user?: { name?: string; sub?: string }) {
    const student = await this.prisma.student.findUnique({ where: { id } });
    const result = await this.prisma.$transaction([
      this.prisma.scheduleSlot.deleteMany({ where: { student_id: id } }),
      this.prisma.session.deleteMany({ where: { student_id: id } }),
      this.prisma.payment.deleteMany({ where: { student_id: id } }),
      this.prisma.assessment.deleteMany({ where: { student_id: id } }),
      this.prisma.student.delete({ where: { id } }),
    ]);
    await this.logActivity(
      '個案',
      '刪除個案',
      `刪除個案 ${student?.name ?? id}`,
      user,
    );
    return result;
  }

  async listSlots() {
    const slots = await this.prisma.scheduleSlot.findMany();
    return slots.map((slot) => ({
      ...slot,
      effective_from: formatDate(slot.effective_from),
    }));
  }

  async createSlot(payload: any, user?: { name?: string; sub?: string }) {
    const { start, end } = resolveTimeRange(payload);
    const slot = await this.prisma.scheduleSlot.create({
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
    await this.logActivity(
      '課程',
      '新增固定課表',
      `新增固定課表 ${slot.weekday} ${slot.start_time}-${slot.end_time}`,
      user,
    );
    return slot;
  }

  async updateSlot(id: string, payload: any, user?: { name?: string; sub?: string }) {
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

    const slot = await this.prisma.scheduleSlot.update({ where: { id }, data });
    await this.logActivity(
      '課程',
      '更新固定課表',
      `更新固定課表 ${slot.weekday} ${slot.start_time}-${slot.end_time}`,
      user,
    );
    return slot;
  }

  async deleteSlot(id: string, user?: { name?: string; sub?: string }) {
    const slot = await this.prisma.scheduleSlot.delete({ where: { id } });
    await this.logActivity(
      '課程',
      '刪除固定課表',
      `刪除固定課表 ${slot.weekday} ${slot.start_time}-${slot.end_time}`,
      user,
    );
    return slot;
  }

  async listSessions() {
    const sessions = await this.prisma.session.findMany();
    return sessions.map((session) => ({
      ...session,
      session_date: formatDate(session.session_date),
    }));
  }

  async createSession(payload: any, user?: { name?: string; sub?: string }) {
    const { start, end } = resolveTimeRange(payload);
    const session = await this.prisma.session.create({
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
    await this.logActivity(
      '課程',
      '新增課程',
      `新增課程 ${formatDate(session.session_date)} ${session.start_time}-${session.end_time}`,
      user,
    );
    return session;
  }

  async updateSession(id: string, payload: any, user?: { name?: string; sub?: string }) {
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

    const session = await this.prisma.session.update({ where: { id }, data });
    await this.logActivity(
      '課程',
      '更新課程',
      `更新課程 ${formatDate(session.session_date)} ${session.start_time}-${session.end_time}`,
      user,
    );
    return session;
  }

  async deleteSession(id: string, user?: { name?: string; sub?: string }) {
    const session = await this.prisma.session.delete({ where: { id } });
    await this.logActivity(
      '課程',
      '刪除課程',
      `刪除課程 ${formatDate(session.session_date)} ${session.start_time}-${session.end_time}`,
      user,
    );
    return session;
  }

  async createSessionsForWeek(
    payload: {
      week_start?: string;
      weekStart?: string;
      anchor_date?: string;
      anchorDate?: string;
      tz_offset?: number;
      tzOffset?: number;
    } = {},
    user?: { name?: string; sub?: string },
  ) {
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

    await this.logActivity(
      '課程',
      '批次建立課程',
      `批次建立課程 ${formatDate(weekStart)} ~ ${formatDate(weekEnd)}，新增 ${sessionsToCreate.length} 筆`,
      user,
    );

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

  async createPayment(payload: any, user?: { name?: string; sub?: string }) {
    // Auto-calculate sessions_count if not provided
    let sessionsCount = payload.sessions_count;

    if (sessionsCount === undefined || sessionsCount === null) {
      sessionsCount = await this.assessmentHelper.getSessionsCountForStudent(payload.student_id);
    }

    const payment = await this.prisma.payment.create({
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
    await this.logActivity(
      '繳費',
      '新增繳費',
      `新增繳費 ${payment.amount} (${payment.status})`,
      user,
    );
    return payment;
  }

  async updatePayment(id: string, payload: any, user?: { name?: string; sub?: string }) {
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

    const payment = await this.prisma.payment.update({ where: { id }, data });
    await this.logActivity(
      '繳費',
      '更新繳費',
      `更新繳費 ${payment.amount} (${payment.status})`,
      user,
    );
    return payment;
  }

  async deletePayment(id: string, user?: { name?: string; sub?: string }) {
    const payment = await this.prisma.payment.delete({ where: { id } });
    await this.logActivity(
      '繳費',
      '刪除繳費',
      `刪除繳費 ${payment.amount} (${payment.status})`,
      user,
    );
    return payment;
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

  async listActivities(params?: {
    page?: number;
    pageSize?: number;
    start_date?: string;
    end_date?: string;
    user?: string;
    line_uid?: string;
    line_uids?: string;
    users?: string;
  }) {
    const page = Math.max(Number(params?.page ?? 1) || 1, 1);
    const pageSize = Math.max(Number(params?.pageSize ?? 20) || 20, 1);
    const startDate = params?.start_date ? new Date(params.start_date) : null;
    const endDate = params?.end_date ? new Date(params.end_date) : null;

    const where: any = {};
    if (startDate && !isNaN(startDate.getTime())) {
      where.timestamp = { ...(where.timestamp ?? {}), gte: startDate };
    }
    if (endDate && !isNaN(endDate.getTime())) {
      endDate.setHours(23, 59, 59, 999);
      where.timestamp = { ...(where.timestamp ?? {}), lte: endDate };
    }
    const lineUidsCsv = params?.line_uids?.trim();
    const usersCsv = params?.users?.trim();
    const lineUidList = lineUidsCsv
      ? lineUidsCsv.split(',').map((item) => item.trim()).filter(Boolean)
      : [];
    const userList = usersCsv
      ? usersCsv.split(',').map((item) => item.trim()).filter(Boolean)
      : [];

    if (lineUidList.length > 0 || userList.length > 0) {
      where.OR = [
        lineUidList.length > 0 ? { line_uid: { in: lineUidList } } : undefined,
        userList.length > 0 ? { user: { in: userList } } : undefined,
      ].filter(Boolean);
    } else if (params?.line_uid) {
      where.line_uid = params.line_uid;
    } else if (params?.user) {
      where.user = { contains: params.user };
    }

    const [total, activities] = await Promise.all([
      this.prisma.activityLog.count({ where }),
      this.prisma.activityLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const lineUids = Array.from(
      new Set(activities.map((activity) => activity.line_uid).filter(Boolean)),
    ) as string[];
    const users = lineUids.length
      ? await this.prisma.lineUser.findMany({
          where: { line_uid: { in: lineUids } },
        })
      : [];
    const userMap = new Map(users.map((user) => [user.line_uid, user]));

    return {
      items: activities.map((activity) => ({
        ...activity,
        timestamp: formatDateTime(activity.timestamp),
        user_picture: activity.line_uid ? userMap.get(activity.line_uid)?.picture_url ?? null : null,
        user_display_name: activity.line_uid
          ? userMap.get(activity.line_uid)?.system_display_name ??
            userMap.get(activity.line_uid)?.line_display_name ??
            userMap.get(activity.line_uid)?.display_name ??
            null
          : null,
      })),
      total,
      page,
      pageSize,
    };
  }

  async listActivityOperators() {
    const activities = await this.prisma.activityLog.findMany({
      select: { user: true, line_uid: true },
      distinct: ['user', 'line_uid'],
    });
    const lineUids = Array.from(
      new Set(activities.map((activity) => activity.line_uid).filter(Boolean)),
    ) as string[];
    const users = lineUids.length
      ? await this.prisma.lineUser.findMany({
          where: { line_uid: { in: lineUids } },
        })
      : [];
    const userMap = new Map(users.map((user) => [user.line_uid, user]));
    return activities
      .map((activity) => {
        const lineUser = activity.line_uid ? userMap.get(activity.line_uid) : null;
        return {
          line_uid: activity.line_uid ?? null,
          user: activity.user,
          user_display_name:
            lineUser?.system_display_name ??
            lineUser?.line_display_name ??
            lineUser?.display_name ??
            activity.user,
          user_picture: lineUser?.picture_url ?? null,
        };
      })
      .sort((a, b) => (a.user_display_name || '').localeCompare(b.user_display_name || ''));
  }

  async createAssessment(payload: any, user?: { name?: string; sub?: string }) {
    const assessment = await this.prisma.assessment.create({
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
    await this.logActivity(
      '個案',
      '新增檢測',
      `新增檢測 ${formatDate(assessment.assessed_at)}`,
      user,
    );
    return assessment;
  }

  async updateAssessment(id: string, payload: any, user?: { name?: string; sub?: string }) {
    const data: Record<string, any> = {};
    if (payload.student_id !== undefined) data.student_id = payload.student_id;
    if (payload.assessed_at !== undefined) data.assessed_at = toDate(payload.assessed_at);
    if (payload.scoring_system !== undefined) data.scoring_system = payload.scoring_system;
    if (payload.summary !== undefined) data.summary = payload.summary;
    if (payload.status !== undefined) data.status = payload.status;
    if (payload.stars !== undefined) data.stars = payload.stars;
    if (payload.metrics !== undefined) data.metrics = payload.metrics;

    const assessment = await this.prisma.assessment.update({ where: { id }, data });
    await this.logActivity(
      '個案',
      '更新檢測',
      `更新檢測 ${formatDate(assessment.assessed_at)}`,
      user,
    );
    return assessment;
  }

  async deleteAssessment(id: string, user?: { name?: string; sub?: string }) {
    const assessment = await this.prisma.assessment.delete({ where: { id } });
    await this.logActivity(
      '個案',
      '刪除檢測',
      `刪除檢測 ${formatDate(assessment.assessed_at)}`,
      user,
    );
    return assessment;
  }
}
