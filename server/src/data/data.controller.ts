import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { DataService } from './data.service';

@Controller()
export class DataController {
  constructor(private readonly dataService: DataService) {}

  @Get('students')
  listStudents() {
    return this.dataService.listStudents();
  }

  @Post('students')
  createStudent(@Body() payload: any) {
    return this.dataService.createStudent(payload);
  }

  @Patch('students/:id')
  updateStudent(@Param('id') id: string, @Body() payload: any) {
    return this.dataService.updateStudent(id, payload);
  }

  @Delete('students/:id')
  deleteStudent(@Param('id') id: string) {
    return this.dataService.deleteStudent(id);
  }

  @Get('slots')
  listSlots() {
    return this.dataService.listSlots();
  }

  @Post('slots')
  createSlot(@Body() payload: any) {
    return this.dataService.createSlot(payload);
  }

  @Patch('slots/:id')
  updateSlot(@Param('id') id: string, @Body() payload: any) {
    return this.dataService.updateSlot(id, payload);
  }

  @Delete('slots/:id')
  deleteSlot(@Param('id') id: string) {
    return this.dataService.deleteSlot(id);
  }

  @Get('sessions')
  listSessions() {
    return this.dataService.listSessions();
  }

  @Post('sessions')
  createSession(@Body() payload: any) {
    return this.dataService.createSession(payload);
  }

  @Patch('sessions/:id')
  updateSession(@Param('id') id: string, @Body() payload: any) {
    return this.dataService.updateSession(id, payload);
  }

  @Delete('sessions/:id')
  deleteSession(@Param('id') id: string) {
    return this.dataService.deleteSession(id);
  }

  @Get('payments')
  listPayments() {
    return this.dataService.listPayments();
  }

  @Post('payments')
  createPayment(@Body() payload: any) {
    return this.dataService.createPayment(payload);
  }

  @Patch('payments/:id')
  updatePayment(@Param('id') id: string, @Body() payload: any) {
    return this.dataService.updatePayment(id, payload);
  }

  @Delete('payments/:id')
  deletePayment(@Param('id') id: string) {
    return this.dataService.deletePayment(id);
  }

  @Get('assessments')
  listAssessments() {
    return this.dataService.listAssessments();
  }

  @Post('assessments')
  createAssessment(@Body() payload: any) {
    return this.dataService.createAssessment(payload);
  }

  @Patch('assessments/:id')
  updateAssessment(@Param('id') id: string, @Body() payload: any) {
    return this.dataService.updateAssessment(id, payload);
  }

  @Delete('assessments/:id')
  deleteAssessment(@Param('id') id: string) {
    return this.dataService.deleteAssessment(id);
  }
}
