import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

const toDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
};

@Injectable()
export class DataService {
  constructor(private readonly prisma: PrismaService) {}

  async listStudents() {
    return this.prisma.student.findMany();
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
    return this.prisma.scheduleSlot.findMany();
  }

  async createSlot(payload: any) {
    return this.prisma.scheduleSlot.create({
      data: {
        id: randomUUID(),
        student_id: payload.student_id,
        weekday: Number(payload.weekday),
        time_slot: payload.time_slot,
        note: payload.note ?? null,
        effective_from: toDate(payload.effective_from),
      },
    });
  }

  async updateSlot(id: string, payload: any) {
    const data: Record<string, any> = {};
    if (payload.student_id !== undefined) data.student_id = payload.student_id;
    if (payload.weekday !== undefined) data.weekday = Number(payload.weekday);
    if (payload.time_slot !== undefined) data.time_slot = payload.time_slot;
    if (payload.note !== undefined) data.note = payload.note;
    if (payload.effective_from !== undefined) data.effective_from = toDate(payload.effective_from);

    return this.prisma.scheduleSlot.update({ where: { id }, data });
  }

  async deleteSlot(id: string) {
    return this.prisma.scheduleSlot.delete({ where: { id } });
  }

  async listSessions() {
    return this.prisma.session.findMany();
  }

  async createSession(payload: any) {
    return this.prisma.session.create({
      data: {
        id: randomUUID(),
        student_id: payload.student_id,
        session_date: toDate(payload.session_date) ?? new Date(),
        time_slot: payload.time_slot,
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
    if (payload.time_slot !== undefined) data.time_slot = payload.time_slot;
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

  async listPayments() {
    return this.prisma.payment.findMany();
  }

  async createPayment(payload: any) {
    return this.prisma.payment.create({
      data: {
        id: randomUUID(),
        student_id: payload.student_id,
        paid_at: toDate(payload.paid_at),
        amount: Number(payload.amount ?? 0),
        method: payload.method ?? null,
        status: payload.status ?? '未繳',
        invoice_no: payload.invoice_no ?? null,
        sessions_count: payload.sessions_count ?? null,
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
    return this.prisma.assessment.findMany();
  }

  async createAssessment(payload: any) {
    return this.prisma.assessment.create({
      data: {
        id: randomUUID(),
        student_id: payload.student_id,
        assessed_at: toDate(payload.assessed_at) ?? new Date(),
        scoring_system: payload.scoring_system ?? 'LEC-Standard',
        summary: payload.summary ?? null,
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
    if (payload.metrics !== undefined) data.metrics = payload.metrics;

    return this.prisma.assessment.update({ where: { id }, data });
  }

  async deleteAssessment(id: string) {
    return this.prisma.assessment.delete({ where: { id } });
  }
}
