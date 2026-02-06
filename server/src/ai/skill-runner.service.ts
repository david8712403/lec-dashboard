import { Injectable } from '@nestjs/common';
import { StudentSkill } from './skills/student.skill';
import { ScheduleSkill } from './skills/schedule.skill';
import { AttendanceSkill } from './skills/attendance.skill';
import { AssessmentSkill } from './skills/assessment.skill';
import { PaymentSkill } from './skills/payment.skill';

const SKILL_ROUTES: Record<string, string> = {
  // Student
  add_student:    'student',
  get_student:    'student',
  list_students:  'student',
  update_student: 'student',
  // Schedule
  add_schedule:           'schedule',
  get_student_schedules:  'schedule',
  get_weekly_schedule:    'schedule',
  delete_schedule:        'schedule',
  // Attendance
  add_attendance:  'attendance',
  add_leave:       'attendance',
  get_attendance:  'attendance',
  get_leaves:      'attendance',
  add_class_note:  'attendance',
  // Assessment
  add_assessment:         'assessment',
  get_assessments:        'assessment',
  get_latest_assessment:  'assessment',
  compare_assessments:    'assessment',
  // Payment
  add_payment:    'payment',
  get_payments:   'payment',
  update_payment: 'payment',
  delete_payment: 'payment',
};

@Injectable()
export class SkillRunnerService {
  constructor(
    private readonly studentSkill:    StudentSkill,
    private readonly scheduleSkill:   ScheduleSkill,
    private readonly attendanceSkill: AttendanceSkill,
    private readonly assessmentSkill: AssessmentSkill,
    private readonly paymentSkill:    PaymentSkill,
  ) {}

  async run(action: string, args: Record<string, unknown>) {
    const route = SKILL_ROUTES[action];
    if (!route) throw new Error(`Unknown action: ${action}`);

    switch (route) {
      case 'student':    return this.studentSkill.run(action, args);
      case 'schedule':   return this.scheduleSkill.run(action, args);
      case 'attendance': return this.attendanceSkill.run(action, args);
      case 'assessment': return this.assessmentSkill.run(action, args);
      case 'payment':    return this.paymentSkill.run(action, args);
    }
  }
}
