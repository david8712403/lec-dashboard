import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveStudent, normalizeWeekday, resolveTimeRange, weekdayName } from './helpers';

@Injectable()
export class ScheduleSkill {
  constructor(private readonly prisma: PrismaService) {}

  async run(action: string, args: Record<string, unknown>) {
    switch (action) {
      case 'add_schedule':            return this.addSchedule(args);
      case 'get_student_schedules':   return this.getStudentSchedules(args);
      case 'get_weekly_schedule':     return this.getWeeklySchedule(args);
      case 'delete_schedule':         return this.deleteSchedule(args);
      default: throw new Error(`ScheduleSkill: unknown action "${action}"`);
    }
  }

  private async addSchedule(args: Record<string, unknown>) {
    const student = await resolveStudent(this.prisma, args.student);
    const weekday = normalizeWeekday(args.weekday);
    const { start, end } = resolveTimeRange(args.start_time, args.end_time);
    const slot = await this.prisma.scheduleSlot.create({
      data: { id: randomUUID(), student_id: student.id, weekday, start_time: start, end_time: end },
    });
    return { schedule_id: slot.id };
  }

  private async getStudentSchedules(args: Record<string, unknown>) {
    const student = await resolveStudent(this.prisma, args.student);
    const slots = await this.prisma.scheduleSlot.findMany({
      where: { student_id: student.id },
      orderBy: [{ weekday: 'asc' }, { start_time: 'asc' }],
    });
    return slots.map((slot) => {
      return {
        id: slot.id,
        weekday: slot.weekday,
        weekday_name: weekdayName(slot.weekday),
        start_time: slot.start_time,
        end_time: slot.end_time,
        student_name: student.name,
      };
    });
  }

  private async getWeeklySchedule(args: Record<string, unknown>) {
    const weekday = args.weekday ? normalizeWeekday(args.weekday) : undefined;
    const slots = await this.prisma.scheduleSlot.findMany({
      where: weekday ? { weekday } : undefined,
      orderBy: [{ weekday: 'asc' }, { start_time: 'asc' }],
      include: { student: true },
    });
    return slots.map((slot) => {
      return {
        id: slot.id,
        weekday: slot.weekday,
        weekday_name: weekdayName(slot.weekday),
        start_time: slot.start_time,
        end_time: slot.end_time,
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
}
