import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveStudent, parseDateInput, formatDate, resolveTimeRange } from './helpers';

@Injectable()
export class AttendanceSkill {
  constructor(private readonly prisma: PrismaService) {}

  async run(action: string, args: Record<string, unknown>) {
    switch (action) {
      case 'add_attendance':  return this.addAttendance(args);
      case 'add_leave':       return this.addLeave(args);
      case 'get_attendance':  return this.getAttendance(args);
      case 'get_leaves':      return this.getLeaves(args);
      case 'add_class_note':  return this.addClassNote(args);
      default: throw new Error(`AttendanceSkill: unknown action "${action}"`);
    }
  }

  private async addAttendance(args: Record<string, unknown>) {
    const student = await resolveStudent(this.prisma, args.student);
    const sessionDate = parseDateInput(args.class_date as string);
    if (!sessionDate) throw new Error('無效的上課日期。');
    const { start, end } = resolveTimeRange(args.start_time, args.end_time);
    const content = this.buildAttendanceContent(args);
    const session = await this.prisma.session.create({
      data: {
        id: randomUUID(),
        student_id: student.id,
        session_date: sessionDate,
        start_time: start,
        end_time: end,
        attendance: (args.status as string | undefined) ?? '到課',
        performance_log: content ? JSON.stringify(content, null, 2) : null,
        note: (args.notes as string | undefined) ?? null,
      },
    });
    return { attendance_id: session.id };
  }

  private async addLeave(args: Record<string, unknown>) {
    const student = await resolveStudent(this.prisma, args.student);
    const leaveDate = parseDateInput(args.leave_date as string);
    if (!leaveDate) throw new Error('無效的請假日期。');
    const session = await this.prisma.session.create({
      data: {
        id: randomUUID(),
        student_id: student.id,
        session_date: leaveDate,
        start_time: '00:00',
        end_time: '00:00',
        attendance: '請假',
        note: (args.reason as string | undefined) ?? null,
      },
    });
    return { leave_id: session.id };
  }

  private async getAttendance(args: Record<string, unknown>) {
    const student = await resolveStudent(this.prisma, args.student);
    const startDate = parseDateInput(args.start_date as string | undefined);
    const endDate = parseDateInput(args.end_date as string | undefined);

    const sessions = await this.prisma.session.findMany({
      where: {
        student_id: student.id,
        session_date: {
          gte: startDate ?? undefined,
          lte: endDate ?? undefined,
        },
      },
      orderBy: [{ session_date: 'desc' }, { start_time: 'asc' }],
    });

    return sessions.map((session) => {
      const parsed = this.parseAttendanceContent(session.performance_log);
      return {
        id: session.id,
        date: formatDate(session.session_date),
        start_time: session.start_time,
        end_time: session.end_time,
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
    const student = await resolveStudent(this.prisma, args.student);
    const sessions = await this.prisma.session.findMany({
      where: { student_id: student.id, attendance: '請假' },
      orderBy: [{ session_date: 'desc' }],
    });
    return sessions.map((session) => ({
      id: session.id,
      leave_date: formatDate(session.session_date),
      reason: session.note ?? null,
      student_name: student.name,
    }));
  }

  private async addClassNote(args: Record<string, unknown>) {
    const student = await resolveStudent(this.prisma, args.student);
    const noteDate = parseDateInput(args.note_date as string);
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
    try { return JSON.parse(raw); }
    catch { return { notes: raw }; }
  }
}
