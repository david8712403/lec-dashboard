import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { DataService } from './data.service';

@Controller()
export class DataController {
  constructor(private readonly dataService: DataService) {}

  @Get('students')
  listStudents() {
    return this.dataService.listStudents();
  }

  @Post('students')
  createStudent(@Req() request: FastifyRequest, @Body() payload: any) {
    return this.dataService.createStudent(payload, (request as any)?.user);
  }

  @Patch('students/:id')
  updateStudent(@Req() request: FastifyRequest, @Param('id') id: string, @Body() payload: any) {
    return this.dataService.updateStudent(id, payload, (request as any)?.user);
  }

  @Delete('students/:id')
  deleteStudent(@Req() request: FastifyRequest, @Param('id') id: string) {
    return this.dataService.deleteStudent(id, (request as any)?.user);
  }

  @Get('slots')
  listSlots() {
    return this.dataService.listSlots();
  }

  @Post('slots')
  createSlot(@Req() request: FastifyRequest, @Body() payload: any) {
    return this.dataService.createSlot(payload, (request as any)?.user);
  }

  @Patch('slots/:id')
  updateSlot(@Req() request: FastifyRequest, @Param('id') id: string, @Body() payload: any) {
    return this.dataService.updateSlot(id, payload, (request as any)?.user);
  }

  @Delete('slots/:id')
  deleteSlot(@Req() request: FastifyRequest, @Param('id') id: string) {
    return this.dataService.deleteSlot(id, (request as any)?.user);
  }

  @Get('sessions')
  listSessions() {
    return this.dataService.listSessions();
  }

  @Get('sessions/workbench')
  listSessionWorkbench(
    @Query()
    query: {
      date?: string;
      view?: 'today' | 'week';
      status?: 'pending' | 'all';
    },
  ) {
    return this.dataService.listSessionWorkbench({
      date: query.date,
      view: query.view,
      status: query.status,
    });
  }

  @Post('sessions')
  createSession(@Req() request: FastifyRequest, @Body() payload: any) {
    return this.dataService.createSession(payload, (request as any)?.user);
  }

  @Post('sessions/quick-open')
  quickOpenSession(@Req() request: FastifyRequest, @Body() payload: any) {
    return this.dataService.quickOpenSession(payload, (request as any)?.user);
  }

  @Post('sessions/bulk-week')
  createSessionsForWeek(@Req() request: FastifyRequest, @Body() payload: any) {
    return this.dataService.createSessionsForWeek(payload, (request as any)?.user);
  }

  @Patch('sessions/:id/quick')
  quickUpdateSession(@Req() request: FastifyRequest, @Param('id') id: string, @Body() payload: any) {
    return this.dataService.quickUpdateSession(id, payload, (request as any)?.user);
  }

  @Post('sessions/:id/complete')
  completeSession(@Req() request: FastifyRequest, @Param('id') id: string) {
    return this.dataService.completeSession(id, (request as any)?.user);
  }

  @Post('sessions/:id/summary')
  generateSessionSummary(@Req() request: FastifyRequest, @Param('id') id: string) {
    return this.dataService.generateSessionSummary(id, (request as any)?.user);
  }

  @Patch('sessions/:id')
  updateSession(@Req() request: FastifyRequest, @Param('id') id: string, @Body() payload: any) {
    return this.dataService.updateSession(id, payload, (request as any)?.user);
  }

  @Delete('sessions/:id')
  deleteSession(@Req() request: FastifyRequest, @Param('id') id: string) {
    return this.dataService.deleteSession(id, (request as any)?.user);
  }

  @Get('payments')
  listPayments() {
    return this.dataService.listPayments();
  }

  @Post('payments')
  createPayment(@Req() request: FastifyRequest, @Body() payload: any) {
    return this.dataService.createPayment(payload, (request as any)?.user);
  }

  @Post('payments/bulk-month')
  bulkCreatePaymentsByMonth(@Req() request: FastifyRequest, @Body() payload: any) {
    return this.dataService.bulkCreatePaymentsByMonth(payload, (request as any)?.user);
  }

  @Patch('payments/:id')
  updatePayment(@Req() request: FastifyRequest, @Param('id') id: string, @Body() payload: any) {
    return this.dataService.updatePayment(id, payload, (request as any)?.user);
  }

  @Delete('payments/:id')
  deletePayment(@Req() request: FastifyRequest, @Param('id') id: string) {
    return this.dataService.deletePayment(id, (request as any)?.user);
  }

  @Get('assessments')
  listAssessments() {
    return this.dataService.listAssessments();
  }

  @Get('monthly-reports')
  listMonthlyReports(@Query('month_ref') monthRef?: string) {
    return this.dataService.listMonthlyReports({ month_ref: monthRef });
  }

  @Get('monthly-reports/:id')
  getMonthlyReport(@Param('id') id: string) {
    return this.dataService.getMonthlyReport(id);
  }

  @Post('monthly-reports/sync')
  syncMonthlyReport(@Req() request: FastifyRequest, @Body() payload: any) {
    return this.dataService.syncMonthlyReport(payload, (request as any)?.user);
  }

  @Patch('monthly-reports/:id')
  updateMonthlyReport(@Req() request: FastifyRequest, @Param('id') id: string, @Body() payload: any) {
    return this.dataService.updateMonthlyReport(id, payload, (request as any)?.user);
  }

  @Get('activity')
  listActivities(
    @Query()
    query: {
      page?: string;
      pageSize?: string;
      start_date?: string;
      end_date?: string;
      user?: string;
      line_uid?: string;
      line_uids?: string;
      users?: string;
    },
  ) {
    return this.dataService.listActivities({
      page: query.page ? Number(query.page) : undefined,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
      start_date: query.start_date,
      end_date: query.end_date,
      user: query.user,
      line_uid: query.line_uid,
      line_uids: query.line_uids,
      users: query.users,
    });
  }

  @Get('activity/operators')
  listActivityOperators() {
    return this.dataService.listActivityOperators();
  }

  @Post('assessments')
  createAssessment(@Req() request: FastifyRequest, @Body() payload: any) {
    return this.dataService.createAssessment(payload, (request as any)?.user);
  }

  @Patch('assessments/:id')
  updateAssessment(@Req() request: FastifyRequest, @Param('id') id: string, @Body() payload: any) {
    return this.dataService.updateAssessment(id, payload, (request as any)?.user);
  }

  @Delete('assessments/:id')
  deleteAssessment(@Req() request: FastifyRequest, @Param('id') id: string) {
    return this.dataService.deleteAssessment(id, (request as any)?.user);
  }
}
