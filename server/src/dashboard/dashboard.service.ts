import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const formatDate = (value?: Date | null) =>
  value ? value.toISOString().split('T')[0] : undefined;

const formatDateTime = (value?: Date | null) =>
  value ? value.toISOString() : undefined;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const [students, slots, sessions, payments, assessments, activities] =
      await Promise.all([
        this.prisma.student.findMany(),
        this.prisma.scheduleSlot.findMany(),
        this.prisma.session.findMany(),
        this.prisma.payment.findMany(),
        this.prisma.assessment.findMany(),
        this.prisma.activityLog.findMany(),
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
      students: students.map((student) => ({
        ...student,
        birthday: formatDate(student.birthday),
        created_at: formatDate(student.created_at),
        tags: Array.isArray(student.tags) ? student.tags : [],
      })),
      slots: slots.map((slot) => ({
        ...slot,
        effective_from: formatDate(slot.effective_from),
      })),
      sessions: sessions.map((session) => ({
        ...session,
        session_date: formatDate(session.session_date),
      })),
      payments: payments.map((payment) => ({
        ...payment,
        paid_at: formatDate(payment.paid_at),
      })),
      assessments: assessments.map((assessment) => ({
        ...assessment,
        assessed_at: formatDate(assessment.assessed_at),
        metrics: typeof assessment.metrics === 'string'
          ? JSON.parse(assessment.metrics)
          : (assessment.metrics ?? {}),
      })),
      activities: activities.map((activity) => ({
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
    };
  }

  async getDashboardStats() {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    const [activeStudents, testingInProgress, unpaidCurrentMonth, assessmentsForStars] =
      await Promise.all([
        this.prisma.student.count({ where: { status: '進行中' } }),
        this.prisma.assessment.findMany({
          where: { status: { in: ['未測驗', '分析中', '待諮詢'] } },
          include: { student: true },
          orderBy: { assessed_at: 'desc' },
        }),
        this.prisma.payment.findMany({
          where: {
            status: '未繳',
            month_ref: { startsWith: currentMonth },
          },
          include: { student: true },
        }),
        this.prisma.assessment.findMany({
          select: { metrics: true },
        }),
      ]);

    const totalStars = assessmentsForStars.reduce((sum, assessment) => {
      const metrics = typeof assessment.metrics === 'string'
        ? (() => {
            try {
              return JSON.parse(assessment.metrics);
            } catch {
              return {};
            }
          })()
        : (assessment.metrics ?? {});
      const value = (metrics as { stars?: unknown }).stars;
      const numeric = Number(value);
      return Number.isFinite(numeric) ? sum + numeric : sum;
    }, 0);

    return {
      totalStars,
      activeStudents,
      testingInProgress: testingInProgress.map((assessment) => ({
        ...assessment,
        assessed_at: formatDate(assessment.assessed_at),
        metrics: typeof assessment.metrics === 'string'
          ? JSON.parse(assessment.metrics)
          : (assessment.metrics ?? {}),
        student: {
          ...assessment.student,
          birthday: formatDate(assessment.student.birthday),
          created_at: formatDate(assessment.student.created_at),
          tags: Array.isArray(assessment.student.tags) ? assessment.student.tags : [],
        },
      })),
      unpaidCurrentMonth: unpaidCurrentMonth.map((payment) => ({
        ...payment,
        paid_at: formatDate(payment.paid_at),
        student: {
          ...payment.student,
          birthday: formatDate(payment.student.birthday),
          created_at: formatDate(payment.student.created_at),
          tags: Array.isArray(payment.student.tags) ? payment.student.tags : [],
        },
      })),
    };
  }

  async createActivity(payload: {
    id: string;
    timestamp: string;
    category: string;
    action: string;
    description: string;
    user: string;
    line_uid?: string | null;
  }) {
    const parsedTimestamp = payload.timestamp
      ? new Date(payload.timestamp)
      : new Date();

    return this.prisma.activityLog.create({
      data: {
        id: payload.id,
        timestamp: isNaN(parsedTimestamp.getTime())
          ? new Date()
          : parsedTimestamp,
        category: payload.category,
        action: payload.action,
        description: payload.description,
        user: payload.user,
        line_uid: payload.line_uid ?? null,
      },
    });
  }
}
