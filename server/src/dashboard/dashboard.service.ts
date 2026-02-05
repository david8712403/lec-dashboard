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
        metrics: assessment.metrics ?? {},
      })),
      activities: activities.map((activity) => ({
        ...activity,
        timestamp: formatDateTime(activity.timestamp),
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
      },
    });
  }
}
