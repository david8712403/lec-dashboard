import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveStudent, parseDateInput, formatDate, toNullableString } from './helpers';

@Injectable()
export class PaymentSkill {
  constructor(private readonly prisma: PrismaService) {}

  async run(action: string, args: Record<string, unknown>) {
    switch (action) {
      case 'add_payment':    return this.addPayment(args);
      case 'get_payments':   return this.getPayments(args);
      case 'update_payment': return this.updatePayment(args);
      case 'delete_payment': return this.deletePayment(args);
      default: throw new Error(`PaymentSkill: unknown action "${action}"`);
    }
  }

  private async addPayment(args: Record<string, unknown>) {
    const student = await resolveStudent(this.prisma, args.student);
    const amount = Number(args.amount);
    if (Number.isNaN(amount) || amount <= 0) throw new Error('金額必須為正數。');

    // Auto-calculate sessions_count from latest assessment
    let sessionsCount = args.sessions_count !== undefined ? Number(args.sessions_count) : null;

    if (sessionsCount === null) {
      const latestAssessment = await this.prisma.assessment.findFirst({
        where: { student_id: student.id },
        orderBy: { assessed_at: 'desc' },
      });

      if (latestAssessment?.metrics) {
        const metrics = latestAssessment.metrics as any;
        const courseType = metrics.course_type;
        if (courseType) {
          const map: Record<string, number> = { '半1': 4, '百2': 8, '百3': 12 };
          sessionsCount = map[courseType] || null;
        }
      }
    }

    const payment = await this.prisma.payment.create({
      data: {
        id: randomUUID(),
        student_id: student.id,
        amount,
        status: (args.status as string | undefined) ?? '未繳',
        invoice_status: (args.invoice_status as string | undefined) ?? '未開立',
        paid_at: parseDateInput(args.paid_at as string | undefined),
        method: (args.method as string | undefined) ?? '現金',  // Default to cash
        invoice_no: toNullableString(args.invoice_no),
        sessions_count: Number.isNaN(sessionsCount) ? null : sessionsCount,
        month_ref: toNullableString(args.month_ref),
        note: toNullableString(args.note),
      },
    });
    return { payment_id: payment.id };
  }

  private async getPayments(args: Record<string, unknown>) {
    const student = await resolveStudent(this.prisma, args.student);
    const payments = await this.prisma.payment.findMany({
      where: { student_id: student.id },
      orderBy: { month_ref: 'desc' },
    });
    return payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      status: p.status,
      invoice_status: p.invoice_status,
      paid_at: p.paid_at ? formatDate(p.paid_at) : null,
      method: p.method,
      invoice_no: p.invoice_no,
      sessions_count: p.sessions_count ?? null,
      month_ref: p.month_ref,
      note: p.note,
      student_name: student.name,
    }));
  }

  private async updatePayment(args: Record<string, unknown>) {
    const paymentId = String(args.payment_id ?? '').trim();
    if (!paymentId) throw new Error('缺少 payment_id。');
    const data: Record<string, any> = {};
    if (args.status !== undefined)         data.status         = args.status;
    if (args.invoice_status !== undefined) data.invoice_status = args.invoice_status;
    if (args.paid_at !== undefined)        data.paid_at        = parseDateInput(args.paid_at as string);
    if (args.method !== undefined)         data.method         = args.method;
    if (args.invoice_no !== undefined)     data.invoice_no     = toNullableString(args.invoice_no);
    if (args.note !== undefined)           data.note           = toNullableString(args.note);
    if (args.amount !== undefined)         data.amount         = Number(args.amount);
    if (args.sessions_count !== undefined) {
      const parsed = Number(args.sessions_count);
      data.sessions_count = Number.isNaN(parsed) ? null : parsed;
    }
    if (args.month_ref !== undefined)      data.month_ref      = toNullableString(args.month_ref);
    await this.prisma.payment.update({ where: { id: paymentId }, data });
    return { updated: true };
  }

  private async deletePayment(args: Record<string, unknown>) {
    const paymentId = String(args.payment_id ?? '').trim();
    if (!paymentId) throw new Error('缺少 payment_id。');
    await this.prisma.payment.delete({ where: { id: paymentId } });
    return { deleted: true };
  }
}
