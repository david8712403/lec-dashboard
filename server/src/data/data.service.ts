import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { AssessmentHelperService } from './assessment-helper.service';
import { AiService } from '../ai/ai.service';

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

const toSessionDate = (value?: string | null) => {
  if (!value) return null;
  const dateOnly = value.includes('T') ? value.split('T')[0] : value;
  return toUtcDateFromLocalDateString(dateOnly) ?? toDate(value);
};

const getWeekday = (value: Date) => {
  const day = value.getUTCDay();
  return day === 0 ? 7 : day;
};

const SESSION_RECORD_STATUS = {
  PENDING: '待紀錄',
  IN_PROGRESS: '進行中',
  DONE: '已完成',
} as const;

const MONTH_REF_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

const normalizeMonthRef = (value?: string | null) => {
  if (!value) return null;
  const normalized = String(value).trim();
  if (!MONTH_REF_REGEX.test(normalized)) return null;
  return normalized;
};

const getMonthRangeUtc = (monthRef: string) => {
  const [yearText, monthText] = monthRef.split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));
  return { start, end };
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

const toMinuteOfDay = (value?: string | null) => {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const [h, m] = String(value).split(':').map((x) => Number(x));
  if (Number.isNaN(h) || Number.isNaN(m)) return Number.MAX_SAFE_INTEGER;
  return h * 60 + m;
};

@Injectable()
export class DataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assessmentHelper: AssessmentHelperService,
    private readonly aiService: AiService,
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

  private formatStudent(student: any) {
    if (!student) return null;
    return {
      ...student,
      birthday: formatDate(student.birthday),
      created_at: formatDate(student.created_at),
      tags: Array.isArray(student.tags) ? student.tags : [],
    };
  }

  private formatSession(session: any) {
    if (!session) return null;
    return {
      ...session,
      session_date: formatDate(session.session_date),
      completed_at: formatDateTime(session.completed_at),
      updated_at: formatDateTime(session.updated_at),
      attachments: Array.isArray(session.attachments) ? session.attachments : (session.attachments ?? []),
      record_status: session.record_status || SESSION_RECORD_STATUS.PENDING,
      student: session.student ? this.formatStudent(session.student) : undefined,
    };
  }

  private formatMonthlyReport(report: any) {
    if (!report) return null;
    return {
      ...report,
      synced_at: formatDateTime(report.synced_at),
      created_at: formatDateTime(report.created_at),
      updated_at: formatDateTime(report.updated_at),
      source_snapshot:
        typeof report.source_snapshot === 'string'
          ? JSON.parse(report.source_snapshot)
          : (report.source_snapshot ?? {}),
    };
  }

  private buildMonthlyReportTemplate(monthRef: string, snapshot: any) {
    const stats = snapshot?.stats ?? {};
    const paymentsTop = Array.isArray(snapshot?.payments)
      ? snapshot.payments.slice(0, 20)
      : [];
    const sessionsTop = Array.isArray(snapshot?.sessions)
      ? snapshot.sessions.slice(0, 30)
      : [];
    const assessmentsTop = Array.isArray(snapshot?.assessments)
      ? snapshot.assessments.slice(0, 20)
      : [];

    const page1 = [
      `${monthRef} 月報｜課務總覽`,
      '',
      '一、本月重點摘要',
      `- 總堂數：${stats.total_sessions ?? 0}`,
      `- 已完成紀錄：${stats.completed_sessions ?? 0}`,
      `- 待補紀錄：${stats.pending_sessions ?? 0}`,
      `- 出席/請假/補課/停課：${stats.attendance_present ?? 0}/${stats.attendance_absent ?? 0}/${stats.attendance_makeup ?? 0}/${stats.attendance_canceled ?? 0}`,
      `- 活躍個案數：${stats.active_students ?? 0}`,
      '',
      '二、本月課堂明細（前 30 筆）',
      ...sessionsTop.map(
        (session: any, index: number) =>
          `${index + 1}. ${session.session_date} ${session.start_time}-${session.end_time}｜${session.student_name || '未命名'}｜${session.attendance || '未登記'}｜${session.record_status || '待紀錄'}`,
      ),
      '',
      '三、教學觀察',
      '- 本月教學亮點：',
      '- 待加強項目：',
      '- 下月調整方向：',
    ].join('\n');

    const page2 = [
      `${monthRef} 月報｜收費與名單`,
      '',
      '一、收費統計',
      `- 總收費（已繳）：${stats.total_paid_amount ?? 0}`,
      `- 應收總額：${stats.total_expected_amount ?? 0}`,
      `- 未繳筆數：${stats.unpaid_payments ?? 0}`,
      '',
      '二、收費明細（前 20 筆）',
      ...paymentsTop.map(
        (payment: any, index: number) =>
          `${index + 1}. ${payment.student_name || '未命名'}｜${payment.amount}｜${payment.status || '未繳'}｜${payment.method || '-'}｜${payment.month_ref || monthRef}`,
      ),
      '',
      '三、個案/課程名單重點',
      '- 新進個案：',
      '- 離室/停課個案：',
      '- 課程調整說明：',
    ].join('\n');

    const page3 = [
      `${monthRef} 月報｜檢測與教師評核`,
      '',
      '一、檢測統計',
      `- 本月檢測筆數：${stats.total_assessments ?? 0}`,
      `- 平均星等：${stats.average_stars ?? 0}`,
      '',
      '二、檢測明細（前 20 筆）',
      ...assessmentsTop.map(
        (assessment: any, index: number) =>
          `${index + 1}. ${assessment.assessed_at}｜${assessment.student_name || '未命名'}｜狀態:${assessment.status || '未測驗'}｜星等:${assessment.stars ?? 0}`,
      ),
      '',
      '三、教師評核與下月計畫',
      '- 成功案例：',
      '- 風險提醒：',
      '- 下月行動方案：',
      '',
      '四、備註',
      '-',
    ].join('\n');

    return {
      title: `${monthRef} 月報`,
      content_page1: page1,
      content_page2: page2,
      content_page3: page3,
    };
  }

  private async buildMonthlyReportSnapshot(monthRef: string) {
    const { start, end } = getMonthRangeUtc(monthRef);
    const year = Number(monthRef.slice(0, 4));
    const yearStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    const [activeStudents, sessions, payments, assessments, activeScheduleSlots, allSlots, allSessions, yearSessions, yearPayments, yearAssessments] = await Promise.all([
      this.prisma.student.count({ where: { status: '進行中' } }),
      this.prisma.session.findMany({
        where: {
          session_date: {
            gte: start,
            lte: end,
          },
        },
        include: { student: true },
        orderBy: [{ session_date: 'asc' }, { start_time: 'asc' }],
      }),
      this.prisma.payment.findMany({
        where: {
          OR: [
            { month_ref: { startsWith: monthRef } },
            {
              paid_at: {
                gte: start,
                lte: end,
              },
            },
          ],
        },
        include: { student: true },
        orderBy: [{ paid_at: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.assessment.findMany({
        where: {
          assessed_at: {
            gte: start,
            lte: end,
          },
        },
        include: { student: true },
        orderBy: [{ assessed_at: 'asc' }],
      }),
      this.prisma.scheduleSlot.findMany({
        where: { student: { status: '進行中' } },
        include: {
          student: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [{ weekday: 'asc' }, { start_time: 'asc' }, { end_time: 'asc' }],
      }),
      this.prisma.scheduleSlot.findMany({
        select: { start_time: true, end_time: true },
      }),
      this.prisma.session.findMany({
        select: { start_time: true, end_time: true },
      }),
      this.prisma.session.findMany({
        where: {
          session_date: {
            gte: yearStart,
            lte: yearEnd,
          },
        },
        select: {
          session_date: true,
          attendance: true,
          student_id: true,
        },
      }),
      this.prisma.payment.findMany({
        where: {
          OR: [
            { month_ref: { startsWith: `${year}-` } },
            {
              paid_at: {
                gte: yearStart,
                lte: yearEnd,
              },
            },
          ],
        },
        select: {
          student_id: true,
          month_ref: true,
          paid_at: true,
          amount: true,
          status: true,
        },
      }),
      this.prisma.assessment.findMany({
        where: {
          assessed_at: {
            gte: yearStart,
            lte: yearEnd,
          },
        },
        select: {
          assessed_at: true,
          stars: true,
          status: true,
        },
      }),
    ]);

    const completedSessions = sessions.filter(
      (session) => session.record_status === SESSION_RECORD_STATUS.DONE,
    ).length;
    const pendingSessions = sessions.length - completedSessions;
    const paidPayments = payments.filter((payment) => payment.status === '已繳');
    const unpaidPayments = payments.filter((payment) => payment.status !== '已繳');
    const totalPaidAmount = paidPayments.reduce((sum, payment) => sum + (payment.amount ?? 0), 0);
    const totalExpectedAmount = payments.reduce((sum, payment) => sum + (payment.amount ?? 0), 0);
    const averageStarsRaw =
      assessments.length > 0
        ? assessments.reduce((sum, assessment) => sum + (assessment.stars ?? 0), 0) /
          assessments.length
        : 0;

    const studentIds = Array.from(
      new Set(
        [
          ...activeScheduleSlots.map((slot) => slot.student_id),
          ...sessions.map((session) => session.student_id),
          ...payments.map((payment) => payment.student_id),
          ...assessments.map((assessment) => assessment.student_id),
        ].filter(Boolean),
      ),
    );

    const [students, latestAssessments] = await Promise.all([
      this.prisma.student.findMany({
        where: { id: { in: studentIds } },
        select: {
          id: true,
          name: true,
          created_at: true,
        },
      }),
      this.prisma.assessment.findMany({
        where: { student_id: { in: studentIds } },
        orderBy: [{ student_id: 'asc' }, { assessed_at: 'desc' }],
        select: {
          student_id: true,
          assessed_at: true,
          metrics: true,
        },
      }),
    ]);

    const studentMap = new Map(
      students.map((student) => [
        student.id,
        {
          name: student.name,
          admission_date: formatDate(student.created_at) ?? '',
        },
      ]),
    );

    const latestAssessmentMap = new Map<string, { course_type: string; sessions_count: number }>();
    for (const assessment of latestAssessments) {
      if (latestAssessmentMap.has(assessment.student_id)) continue;
      const metrics =
        typeof assessment.metrics === 'string'
          ? JSON.parse(assessment.metrics)
          : (assessment.metrics ?? {});
      const courseType = String(metrics?.course_type ?? '');
      const rawSessionsCount = Number(metrics?.sessions_count);
      const normalizedSessionsCount = Number.isFinite(rawSessionsCount)
        ? rawSessionsCount
        : (this.assessmentHelper.getSessionsCount(courseType) ?? 0);
      latestAssessmentMap.set(assessment.student_id, {
        course_type: courseType,
        sessions_count: normalizedSessionsCount,
      });
    }

    const scheduleTimeSlots = Array.from(
      new Set(
        [...allSlots, ...allSessions]
          .map((item) => (item?.start_time ? `${item.start_time}-${item.end_time || item.start_time}` : ''))
          .filter(Boolean),
      ),
    ).sort((a, b) => {
      const [aStart] = a.split('-');
      const [bStart] = b.split('-');
      return toMinuteOfDay(aStart) - toMinuteOfDay(bStart);
    });

    const rosterAggregate = new Map<
      string,
      {
        student_name: string;
        admission_date: string;
        course_type: string;
        sessions_count: number;
        monthly_fee: number;
        actual_paid: number;
        payment_methods: Set<string>;
      }
    >();

    for (const slot of activeScheduleSlots) {
      const key = slot.student_id;
      const existing =
        rosterAggregate.get(key) ??
        {
          student_name: studentMap.get(key)?.name ?? slot.student?.name ?? '',
          admission_date: studentMap.get(key)?.admission_date ?? '',
          course_type: latestAssessmentMap.get(key)?.course_type ?? '',
          sessions_count: latestAssessmentMap.get(key)?.sessions_count ?? 0,
          monthly_fee: 0,
          actual_paid: 0,
          payment_methods: new Set<string>(),
        };
      rosterAggregate.set(key, existing);
    }

    for (const session of sessions) {
      const key = session.student_id;
      const existing =
        rosterAggregate.get(key) ??
        {
          student_name: studentMap.get(key)?.name ?? session.student?.name ?? '',
          admission_date: studentMap.get(key)?.admission_date ?? '',
          course_type: latestAssessmentMap.get(key)?.course_type ?? '',
          sessions_count: latestAssessmentMap.get(key)?.sessions_count ?? 0,
          monthly_fee: 0,
          actual_paid: 0,
          payment_methods: new Set<string>(),
        };
      rosterAggregate.set(key, existing);
    }

    for (const payment of payments) {
      const key = payment.student_id;
      const existing =
        rosterAggregate.get(key) ??
        {
          student_name: studentMap.get(key)?.name ?? payment.student?.name ?? '',
          admission_date: studentMap.get(key)?.admission_date ?? '',
          course_type: latestAssessmentMap.get(key)?.course_type ?? '',
          sessions_count: latestAssessmentMap.get(key)?.sessions_count ?? 0,
          monthly_fee: 0,
          actual_paid: 0,
          payment_methods: new Set<string>(),
        };
      existing.monthly_fee += Number(payment.amount ?? 0);
      if (payment.status === '已繳') {
        existing.actual_paid += Number(payment.amount ?? 0);
      }
      if (payment.method) {
        existing.payment_methods.add(String(payment.method));
      }
      rosterAggregate.set(key, existing);
    }

    const rosterStudents = Array.from(rosterAggregate.entries())
      .map(([student_id, row], index) => ({
        no: index + 1,
        student_id,
        student_name: row.student_name,
        admission_date: row.admission_date,
        course_type: row.course_type,
        sessions_count: row.sessions_count,
        monthly_fee: row.monthly_fee,
        actual_paid: row.actual_paid,
        payment_method: Array.from(row.payment_methods).join('、'),
      }))
      .sort((a, b) => a.no - b.no);

    const monthKeys = Array.from({ length: 12 }, (_, idx) => `${year}-${String(idx + 1).padStart(2, '0')}`);
    const yearEvalMap = new Map(
      monthKeys.map((monthKey) => [
        monthKey,
        {
          month_ref: monthKey,
          monthly_amount: 0,
          paid_students: new Set<string>(),
          stars_sum: 0,
          stars_count: 0,
          success_cases: 0,
          leave_count: 0,
          absences: 0,
        },
      ]),
    );

    for (const item of yearSessions) {
      const monthKey = formatDate(item.session_date)?.slice(0, 7);
      if (!monthKey || !yearEvalMap.has(monthKey)) continue;
      const bucket = yearEvalMap.get(monthKey)!;
      if (item.attendance === '請假') bucket.absences += 1;
    }

    for (const item of yearPayments) {
      const monthFromRef = normalizeMonthRef(item.month_ref)?.slice(0, 7);
      const monthFromPaidAt = formatDate(item.paid_at)?.slice(0, 7);
      const monthKey = monthFromRef || monthFromPaidAt;
      if (!monthKey || !yearEvalMap.has(monthKey)) continue;
      const bucket = yearEvalMap.get(monthKey)!;
      bucket.monthly_amount += Number(item.amount ?? 0);
      if (item.status === '已繳') {
        bucket.paid_students.add(item.student_id);
      }
    }

    for (const item of yearAssessments) {
      const monthKey = formatDate(item.assessed_at)?.slice(0, 7);
      if (!monthKey || !yearEvalMap.has(monthKey)) continue;
      const bucket = yearEvalMap.get(monthKey)!;
      bucket.stars_sum += Number(item.stars ?? 0);
      bucket.stars_count += 1;
      if (item.status === '完成') bucket.success_cases += 1;
    }

    const yearEvaluation = monthKeys.map((monthKey) => {
      const bucket = yearEvalMap.get(monthKey)!;
      return {
        month_ref: monthKey,
        monthly_amount: bucket.monthly_amount,
        students_count: bucket.paid_students.size,
        stars_average:
          bucket.stars_count > 0 ? Number((bucket.stars_sum / bucket.stars_count).toFixed(2)) : 0,
        success_cases: bucket.success_cases,
        leave_count: bucket.leave_count,
        absences: bucket.absences,
      };
    });

    return {
      month_ref: monthRef,
      generated_at: new Date().toISOString(),
      range: {
        start: formatDate(start),
        end: formatDate(end),
      },
      stats: {
        active_students: activeStudents,
        total_sessions: sessions.length,
        completed_sessions: completedSessions,
        pending_sessions: pendingSessions,
        attendance_present: sessions.filter((session) => session.attendance === '到課').length,
        attendance_absent: sessions.filter((session) => session.attendance === '請假').length,
        attendance_makeup: sessions.filter((session) => session.attendance === '補課').length,
        attendance_canceled: sessions.filter((session) => session.attendance === '停課').length,
        total_payments: payments.length,
        paid_payments: paidPayments.length,
        unpaid_payments: unpaidPayments.length,
        total_paid_amount: totalPaidAmount,
        total_expected_amount: totalExpectedAmount,
        total_assessments: assessments.length,
        average_stars: Number(averageStarsRaw.toFixed(2)),
      },
      schedule_time_slots: scheduleTimeSlots,
      schedule_slots: activeScheduleSlots.map((slot) => ({
        id: slot.id,
        student_id: slot.student_id,
        student_name: slot.student?.name ?? '',
        weekday: slot.weekday,
        start_time: slot.start_time,
        end_time: slot.end_time,
      })),
      roster_students: rosterStudents,
      year_evaluation: yearEvaluation,
      sessions: sessions.map((session) => ({
        id: session.id,
        session_date: formatDate(session.session_date),
        start_time: session.start_time,
        end_time: session.end_time,
        attendance: session.attendance,
        record_status: session.record_status,
        student_id: session.student_id,
        student_name: session.student?.name ?? '',
        admission_date: studentMap.get(session.student_id)?.admission_date ?? '',
        course_type: latestAssessmentMap.get(session.student_id)?.course_type ?? '',
      })),
      payments: payments.map((payment) => ({
        id: payment.id,
        student_id: payment.student_id,
        student_name: payment.student?.name ?? '',
        amount: payment.amount,
        status: payment.status,
        method: payment.method,
        month_ref: payment.month_ref,
        paid_at: formatDate(payment.paid_at),
      })),
      assessments: assessments.map((assessment) => ({
        id: assessment.id,
        student_id: assessment.student_id,
        student_name: assessment.student?.name ?? '',
        assessed_at: formatDate(assessment.assessed_at),
        status: assessment.status,
        stars: assessment.stars,
      })),
    };
  }

  private buildSummaryPrompt(session: {
    performance_log?: string | null;
    student?: { name?: string | null } | null;
  }) {
    const studentName = session.student?.name || '個案';
    return [
      `請根據以下特教課程紀錄，產出一段給家長/保母溝通用的 PC 摘要。`,
      `要求：100-200 字、專業但易懂，包含今日進步、待加強、具體居家建議。`,
      `個案：${studentName}`,
      '',
      '上課表現紀錄：',
      session.performance_log || '',
    ].join('\n');
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
    const sessions = await this.prisma.session.findMany({
      include: { student: true },
      orderBy: [{ session_date: 'desc' }, { start_time: 'asc' }],
    });
    return sessions.map((session) => this.formatSession(session));
  }

  async listSessionWorkbench(params: {
    date?: string;
    view?: 'today' | 'week';
    status?: 'pending' | 'all';
  } = {}) {
    const view = params.view === 'week' ? 'week' : 'today';
    const status = params.status === 'all' ? 'all' : 'pending';
    const anchor =
      toSessionDate(params.date) ??
      toSessionDate(new Date().toISOString().split('T')[0]) ??
      new Date();

    const rangeStart =
      view === 'week'
        ? getWeekStartUtcFromAnchor(anchor, 0)
        : new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate()));
    const rangeEnd = new Date(rangeStart);
    rangeEnd.setUTCDate(rangeStart.getUTCDate() + (view === 'week' ? 6 : 0));
    rangeEnd.setUTCHours(23, 59, 59, 999);

    const [slots, sessions] = await Promise.all([
      this.prisma.scheduleSlot.findMany({
        where: { student: { status: '進行中' } },
        include: { student: true },
      }),
      this.prisma.session.findMany({
        where: {
          session_date: {
            gte: rangeStart,
            lte: rangeEnd,
          },
        },
        include: { student: true },
      }),
    ]);

    const slotsByWeekday = new Map<number, typeof slots>();
    for (const slot of slots) {
      const list = slotsByWeekday.get(slot.weekday) ?? [];
      list.push(slot);
      slotsByWeekday.set(slot.weekday, list);
    }

    const sessionsByKey = new Map<string, (typeof sessions)[number]>();
    for (const session of sessions) {
      const dateStr = formatDate(session.session_date);
      if (!dateStr) continue;
      const key = `${session.student_id}|${dateStr}|${session.start_time}|${session.end_time}`;
      sessionsByKey.set(key, session);
    }

    const matchedKeys = new Set<string>();
    const items: Array<{
      date: string;
      start_time: string;
      end_time: string;
      student_id: string;
      student: any;
      session: any | null;
    }> = [];

    const days = view === 'week' ? 7 : 1;
    for (let offset = 0; offset < days; offset += 1) {
      const currentDate = new Date(rangeStart);
      currentDate.setUTCDate(rangeStart.getUTCDate() + offset);
      const dateStr = formatDate(currentDate);
      if (!dateStr) continue;
      const weekday = getWeekday(currentDate);
      const daySlots = slotsByWeekday.get(weekday) ?? [];
      for (const slot of daySlots) {
        const key = `${slot.student_id}|${dateStr}|${slot.start_time}|${slot.end_time}`;
        matchedKeys.add(key);
        const session = sessionsByKey.get(key) ?? null;
        items.push({
          date: dateStr,
          start_time: slot.start_time,
          end_time: slot.end_time,
          student_id: slot.student_id,
          student: this.formatStudent(slot.student),
          session: session ? this.formatSession(session) : null,
        });
      }
    }

    for (const session of sessions) {
      const dateStr = formatDate(session.session_date);
      if (!dateStr) continue;
      const key = `${session.student_id}|${dateStr}|${session.start_time}|${session.end_time}`;
      if (matchedKeys.has(key)) continue;
      items.push({
        date: dateStr,
        start_time: session.start_time,
        end_time: session.end_time,
        student_id: session.student_id,
        student: this.formatStudent(session.student),
        session: this.formatSession(session),
      });
    }

    const filtered = items
      .filter((item) =>
        status === 'all'
          ? true
          : !item.session || item.session.record_status !== SESSION_RECORD_STATUS.DONE,
      )
      .sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        const startCompare = a.start_time.localeCompare(b.start_time);
        if (startCompare !== 0) return startCompare;
        const endCompare = a.end_time.localeCompare(b.end_time);
        if (endCompare !== 0) return endCompare;
        return (a.student?.name || '').localeCompare(b.student?.name || '', 'zh-Hant');
      });

    return {
      date: formatDate(anchor),
      view,
      status,
      range: {
        start: formatDate(rangeStart),
        end: formatDate(rangeEnd),
      },
      total: filtered.length,
      items: filtered,
    };
  }

  async quickOpenSession(payload: any, user?: { name?: string; sub?: string }) {
    if (!payload?.student_id) {
      throw new BadRequestException('缺少 student_id');
    }
    const { start, end } = resolveTimeRange(payload);
    const sessionDate = toSessionDate(payload.session_date);
    if (!sessionDate) {
      throw new BadRequestException('缺少或無效的 session_date');
    }

    const uniqueWhere = {
      student_id_session_date_start_time_end_time: {
        student_id: payload.student_id,
        session_date: sessionDate,
        start_time: start,
        end_time: end,
      },
    } as any;

    let session = await this.prisma.session.findUnique({
      where: uniqueWhere,
      include: { student: true },
    });

    let created = false;
    if (!session) {
      try {
        session = await this.prisma.session.create({
          data: {
            id: randomUUID(),
            student_id: payload.student_id,
            session_date: sessionDate,
            start_time: start,
            end_time: end,
            attendance: payload.attendance ?? '未登記',
            record_status: SESSION_RECORD_STATUS.PENDING,
            teacher_name: payload.teacher_name ?? null,
            note: payload.note ?? null,
            performance_log: payload.performance_log ?? null,
            pc_summary: payload.pc_summary ?? null,
            attachments: payload.attachments ?? null,
          },
          include: { student: true },
        });
        created = true;
      } catch {
        const startOfDay = new Date(Date.UTC(
          sessionDate.getUTCFullYear(),
          sessionDate.getUTCMonth(),
          sessionDate.getUTCDate(),
        ));
        const endOfDay = new Date(startOfDay);
        endOfDay.setUTCHours(23, 59, 59, 999);
        session = await this.prisma.session.findUnique({
          where: uniqueWhere,
          include: { student: true },
        });
        if (!session) {
          session = await this.prisma.session.findFirst({
            where: {
              student_id: payload.student_id,
              start_time: start,
              end_time: end,
              session_date: {
                gte: startOfDay,
                lte: endOfDay,
              },
            },
            include: { student: true },
          });
        }
      }
    }

    if (!session) {
      throw new NotFoundException('無法建立或取得課堂紀錄');
    }

    if (created) {
      await this.logActivity(
        '課程',
        '快速建立課堂',
        `快速建立課堂 ${formatDate(session.session_date)} ${session.start_time}-${session.end_time}`,
        user,
      );
    }

    return {
      created,
      session: this.formatSession(session),
    };
  }

  async createSession(payload: any, user?: { name?: string; sub?: string }) {
    const { start, end } = resolveTimeRange(payload);
    const sessionDate = toSessionDate(payload.session_date) ?? new Date();
    let session: any;

    try {
      session = await this.prisma.session.create({
        data: {
          id: randomUUID(),
          student_id: payload.student_id,
          session_date: sessionDate,
          start_time: start,
          end_time: end,
          attendance: payload.attendance ?? '未登記',
          record_status: payload.record_status ?? SESSION_RECORD_STATUS.PENDING,
          completed_at: payload.completed_at ? toDate(payload.completed_at) : null,
          teacher_name: payload.teacher_name ?? null,
          note: payload.note ?? null,
          performance_log: payload.performance_log ?? null,
          pc_summary: payload.pc_summary ?? null,
          attachments: payload.attachments ?? null,
        },
      });
    } catch (error) {
      const startOfDay = new Date(Date.UTC(
        sessionDate.getUTCFullYear(),
        sessionDate.getUTCMonth(),
        sessionDate.getUTCDate(),
      ));
      const endOfDay = new Date(startOfDay);
      endOfDay.setUTCHours(23, 59, 59, 999);
      const existing = await this.prisma.session.findFirst({
        where: {
          student_id: payload.student_id,
          start_time: start,
          end_time: end,
          session_date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });
      if (!existing) throw error;
      session = existing;
    }

    await this.logActivity(
      '課程',
      '新增課程',
      `新增課程 ${formatDate(session.session_date)} ${session.start_time}-${session.end_time}`,
      user,
    );
    return this.formatSession(session);
  }

  async quickUpdateSession(id: string, payload: any, user?: { name?: string; sub?: string }) {
    const existing = await this.prisma.session.findUnique({
      where: { id },
      include: { student: true },
    });
    if (!existing) {
      throw new NotFoundException('找不到課堂紀錄');
    }

    const data: Record<string, any> = {};
    const editableKeys = ['attendance', 'note', 'performance_log', 'pc_summary', 'attachments', 'teacher_name'];
    const touched = editableKeys.some((key) => payload[key] !== undefined);

    if (payload.attendance !== undefined) data.attendance = payload.attendance;
    if (payload.note !== undefined) data.note = payload.note;
    if (payload.performance_log !== undefined) data.performance_log = payload.performance_log;
    if (payload.pc_summary !== undefined) data.pc_summary = payload.pc_summary;
    if (payload.attachments !== undefined) data.attachments = payload.attachments;
    if (payload.teacher_name !== undefined) data.teacher_name = payload.teacher_name;

    if (payload.record_status !== undefined) {
      data.record_status = payload.record_status;
    } else if (touched && existing.record_status === SESSION_RECORD_STATUS.PENDING) {
      data.record_status = SESSION_RECORD_STATUS.IN_PROGRESS;
    }

    if (payload.completed_at !== undefined) {
      data.completed_at = toDate(payload.completed_at);
    } else if (data.record_status === SESSION_RECORD_STATUS.DONE) {
      data.completed_at = new Date();
    } else if (
      data.record_status &&
      data.record_status !== SESSION_RECORD_STATUS.DONE &&
      payload.completed_at === undefined
    ) {
      data.completed_at = null;
    }

    const session = await this.prisma.session.update({
      where: { id },
      data,
      include: { student: true },
    });

    await this.logActivity(
      '課程',
      '快速更新課堂',
      `快速更新課堂 ${formatDate(session.session_date)} ${session.start_time}-${session.end_time}`,
      user,
    );

    return { session: this.formatSession(session) };
  }

  async completeSession(id: string, user?: { name?: string; sub?: string }) {
    const existing = await this.prisma.session.findUnique({
      where: { id },
      include: { student: true },
    });
    if (!existing) {
      throw new NotFoundException('找不到課堂紀錄');
    }

    const session = await this.prisma.session.update({
      where: { id },
      data: {
        attendance:
          existing.attendance && existing.attendance !== '未登記'
            ? existing.attendance
            : '到課',
        record_status: SESSION_RECORD_STATUS.DONE,
        completed_at: new Date(),
      },
      include: { student: true },
    });

    await this.logActivity(
      '課程',
      '完成課堂紀錄',
      `完成課堂紀錄 ${formatDate(session.session_date)} ${session.start_time}-${session.end_time}`,
      user,
    );

    return { session: this.formatSession(session) };
  }

  async generateSessionSummary(id: string, user?: { name?: string; sub?: string }) {
    const existing = await this.prisma.session.findUnique({
      where: { id },
      include: { student: true },
    });
    if (!existing) {
      throw new NotFoundException('找不到課堂紀錄');
    }
    const performanceLog = (existing.performance_log || '').trim();
    if (!performanceLog) {
      throw new BadRequestException('請先填寫上課表現紀錄');
    }

    const prompt = this.buildSummaryPrompt(existing);
    const aiResult = await this.aiService.chat(prompt, []);
    const summary = (aiResult.reply || '').trim();
    if (!summary) {
      throw new BadRequestException('AI 未產生摘要內容');
    }

    const session = await this.prisma.session.update({
      where: { id },
      data: {
        pc_summary: summary,
        record_status:
          existing.record_status === SESSION_RECORD_STATUS.PENDING
            ? SESSION_RECORD_STATUS.IN_PROGRESS
            : existing.record_status,
      },
      include: { student: true },
    });

    await this.logActivity(
      '課程',
      '產出課堂摘要',
      `產出課堂摘要 ${formatDate(session.session_date)} ${session.start_time}-${session.end_time}`,
      user,
    );

    return {
      summary,
      session: this.formatSession(session),
    };
  }

  async updateSession(id: string, payload: any, user?: { name?: string; sub?: string }) {
    const data: Record<string, any> = {};
    if (payload.student_id !== undefined) data.student_id = payload.student_id;
    if (payload.session_date !== undefined) data.session_date = toSessionDate(payload.session_date);
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
    if (payload.record_status !== undefined) data.record_status = payload.record_status;
    if (payload.completed_at !== undefined) data.completed_at = toDate(payload.completed_at);
    if (payload.record_status === SESSION_RECORD_STATUS.DONE && payload.completed_at === undefined) {
      data.completed_at = new Date();
    }
    if (
      payload.record_status !== undefined &&
      payload.record_status !== SESSION_RECORD_STATUS.DONE &&
      payload.completed_at === undefined
    ) {
      data.completed_at = null;
    }

    const session = await this.prisma.session.update({ where: { id }, data });
    await this.logActivity(
      '課程',
      '更新課程',
      `更新課程 ${formatDate(session.session_date)} ${session.start_time}-${session.end_time}`,
      user,
    );
    return this.formatSession(session);
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
      student_id?: string;
      studentId?: string;
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
    const studentId = payload.student_id ?? payload.studentId;

    const [slots, existingSessions] = await Promise.all([
      this.prisma.scheduleSlot.findMany({
        where: studentId
          ? { student_id: studentId }
          : { student: { status: '進行中' } },
      }),
      this.prisma.session.findMany({
        where: {
          ...(studentId ? { student_id: studentId } : {}),
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
          record_status: SESSION_RECORD_STATUS.PENDING,
          completed_at: null,
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

  async bulkCreatePaymentsByMonth(
    payload: { month_ref?: string } = {},
    user?: { name?: string; sub?: string },
  ) {
    const monthRef = normalizeMonthRef(payload.month_ref);
    if (!monthRef) {
      throw new BadRequestException('month_ref 格式錯誤，需為 YYYY-MM');
    }

    const activeStudents = await this.prisma.student.findMany({
      where: { status: '進行中' },
      select: {
        id: true,
        default_fee: true,
      },
    });
    if (activeStudents.length === 0) {
      return { month_ref: monthRef, activeStudents: 0, createdCount: 0, skippedCount: 0 };
    }

    const activeStudentIds = activeStudents.map((student) => student.id);
    const existingPayments = await this.prisma.payment.findMany({
      where: {
        month_ref: monthRef,
        student_id: { in: activeStudentIds },
      },
      select: { student_id: true },
    });
    const existingStudentIdSet = new Set(existingPayments.map((payment) => payment.student_id));

    const latestAssessments = await this.prisma.assessment.findMany({
      where: { student_id: { in: activeStudentIds } },
      orderBy: [{ student_id: 'asc' }, { assessed_at: 'desc' }],
      select: {
        student_id: true,
        metrics: true,
      },
    });
    const sessionsCountMap = new Map<string, number | null>();
    for (const assessment of latestAssessments) {
      if (sessionsCountMap.has(assessment.student_id)) continue;
      const metrics =
        typeof assessment.metrics === 'string'
          ? JSON.parse(assessment.metrics)
          : (assessment.metrics ?? {});
      const sessionsCount = this.assessmentHelper.getSessionsCount(
        metrics?.course_type ? String(metrics.course_type) : null,
      );
      sessionsCountMap.set(assessment.student_id, sessionsCount);
    }

    const createData = activeStudents
      .filter((student) => !existingStudentIdSet.has(student.id))
      .map((student) => ({
        id: randomUUID(),
        student_id: student.id,
        paid_at: null,
        amount: Number(student.default_fee ?? 0),
        method: '現金',
        status: '未繳',
        invoice_status: null,
        invoice_no: null,
        sessions_count: sessionsCountMap.get(student.id) ?? null,
        month_ref: monthRef,
        note: null,
      }));

    if (createData.length > 0) {
      await this.prisma.payment.createMany({ data: createData });
    }

    await this.logActivity(
      '繳費',
      '批次建立繳費',
      `建立 ${monthRef} 未繳紀錄 ${createData.length} 筆`,
      user,
    );

    return {
      month_ref: monthRef,
      activeStudents: activeStudents.length,
      createdCount: createData.length,
      skippedCount: activeStudents.length - createData.length,
    };
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

  async listMonthlyReports(params?: { month_ref?: string }) {
    const monthRef = normalizeMonthRef(params?.month_ref);
    const reports = await this.prisma.monthlyReport.findMany({
      where: monthRef ? { month_ref: monthRef } : undefined,
      orderBy: [{ month_ref: 'desc' }],
    });
    return reports.map((report) => this.formatMonthlyReport(report));
  }

  async getMonthlyReport(id: string) {
    const report = await this.prisma.monthlyReport.findUnique({ where: { id } });
    if (!report) {
      throw new NotFoundException('找不到月報資料');
    }
    return this.formatMonthlyReport(report);
  }

  async syncMonthlyReport(
    payload: { month_ref?: string; reset_content?: boolean } = {},
    user?: { name?: string; sub?: string },
  ) {
    const defaultMonthRef = new Date().toISOString().slice(0, 7);
    const monthRef = normalizeMonthRef(payload.month_ref) ?? normalizeMonthRef(defaultMonthRef);
    if (!monthRef) {
      throw new BadRequestException('month_ref 格式錯誤，需為 YYYY-MM');
    }

    const snapshot = await this.buildMonthlyReportSnapshot(monthRef);
    const template = this.buildMonthlyReportTemplate(monthRef, snapshot);
    const shouldResetContent = Boolean(payload.reset_content);

    const existing = await this.prisma.monthlyReport.findUnique({
      where: { month_ref: monthRef },
    });

    const report = existing
      ? await this.prisma.monthlyReport.update({
          where: { id: existing.id },
          data: {
            title: shouldResetContent ? template.title : existing.title || template.title,
            content_page1: shouldResetContent
              ? template.content_page1
              : existing.content_page1 || template.content_page1,
            content_page2: shouldResetContent
              ? template.content_page2
              : existing.content_page2 || template.content_page2,
            content_page3: shouldResetContent
              ? template.content_page3
              : existing.content_page3 || template.content_page3,
            source_snapshot: snapshot,
            sync_status: '已同步',
            synced_at: new Date(),
          },
        })
      : await this.prisma.monthlyReport.create({
          data: {
            id: randomUUID(),
            month_ref: monthRef,
            title: template.title,
            content_page1: template.content_page1,
            content_page2: template.content_page2,
            content_page3: template.content_page3,
            source_snapshot: snapshot,
            sync_status: '已同步',
            synced_at: new Date(),
          },
        });

    await this.logActivity(
      '課程',
      existing ? '同步月報' : '建立月報',
      `${existing ? '同步' : '建立'} ${monthRef} 月報`,
      user,
    );

    return this.formatMonthlyReport(report);
  }

  async updateMonthlyReport(
    id: string,
    payload: {
      title?: string;
      content_page1?: string;
      content_page2?: string;
      content_page3?: string;
      sync_status?: string;
    },
    user?: { name?: string; sub?: string },
  ) {
    const existing = await this.prisma.monthlyReport.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('找不到月報資料');
    }

    const data: Record<string, any> = {};
    if (payload.title !== undefined) data.title = String(payload.title);
    if (payload.content_page1 !== undefined) data.content_page1 = String(payload.content_page1);
    if (payload.content_page2 !== undefined) data.content_page2 = String(payload.content_page2);
    if (payload.content_page3 !== undefined) data.content_page3 = String(payload.content_page3);
    if (payload.sync_status !== undefined) data.sync_status = String(payload.sync_status);

    const report = await this.prisma.monthlyReport.update({
      where: { id },
      data,
    });

    await this.logActivity('課程', '更新月報', `更新 ${existing.month_ref} 月報`, user);
    return this.formatMonthlyReport(report);
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
