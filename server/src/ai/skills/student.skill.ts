import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveStudent, parseDateInput, formatDate, toNullableString } from './helpers';

@Injectable()
export class StudentSkill {
  constructor(private readonly prisma: PrismaService) {}

  async run(action: string, args: Record<string, unknown>) {
    switch (action) {
      case 'add_student':    return this.addStudent(args);
      case 'get_student':    return this.getStudent(args);
      case 'list_students':  return this.listStudents(args);
      case 'update_student': return this.updateStudent(args);
      default: throw new Error(`StudentSkill: unknown action "${action}"`);
    }
  }

  private async addStudent(args: Record<string, unknown>) {
    const name = String(args.name ?? '').trim();
    if (!name) throw new Error('缺少學員姓名。');
    const defaultFee = args.default_fee !== undefined ? Number(args.default_fee) : null;
    const student = await this.prisma.student.create({
      data: {
        id: randomUUID(),
        name,
        phone: toNullableString(args.phone),
        birthday: parseDateInput(args.birthdate as string | undefined),
        gender: toNullableString(args.gender),
        type: (args.type as string | undefined) ?? 'B',
        course_type: (args.course_type as string | undefined) ?? null,
        grade: (args.grade as string | undefined) ?? null,
        default_fee: Number.isNaN(defaultFee) ? null : defaultFee,
        status: (args.status as string | undefined) ?? '待檢測',
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
    return students.map((s) => ({
      id: s.id,
      name: s.name,
      phone: s.phone ?? null,
      birthdate: s.birthday ? formatDate(s.birthday) : null,
      gender: s.gender ?? null,
      type: s.type,
      course_type: s.course_type,
      grade: s.grade,
      default_fee: s.default_fee ?? null,
      status: s.status,
      created_at: s.created_at,
    }));
  }

  private async listStudents(args: Record<string, unknown>) {
    const status = args.status as string | undefined;
    const students = await this.prisma.student.findMany({
      where: status ? { status } : undefined,
      orderBy: { name: 'asc' },
    });
    return students.map((s) => ({
      id: s.id,
      name: s.name,
      phone: s.phone ?? null,
      birthdate: s.birthday ? formatDate(s.birthday) : null,
      gender: s.gender ?? null,
      type: s.type,
      course_type: s.course_type,
      grade: s.grade,
      default_fee: s.default_fee ?? null,
      status: s.status,
    }));
  }

  private async updateStudent(args: Record<string, unknown>) {
    const studentId = String(args.student_id ?? '').trim();
    if (!studentId) throw new Error('缺少 student_id。');
    const data: Record<string, any> = {};
    if (args.name !== undefined)        data.name = args.name;
    if (args.phone !== undefined)       data.phone = toNullableString(args.phone);
    if (args.birthdate !== undefined)   data.birthday = parseDateInput(args.birthdate as string);
    if (args.gender !== undefined)      data.gender = toNullableString(args.gender);
    if (args.type !== undefined)        data.type = args.type;
    if (args.course_type !== undefined) data.course_type = args.course_type;
    if (args.grade !== undefined)       data.grade = args.grade;
    if (args.default_fee !== undefined) {
      const parsed = Number(args.default_fee);
      data.default_fee = Number.isNaN(parsed) ? null : parsed;
    }
    if (args.status !== undefined)      data.status = args.status;
    await this.prisma.student.update({ where: { id: studentId }, data });
    return { updated: true };
  }
}
