import { Student, StudentStatus, ScheduleSlot, Session, AttendanceStatus, Payment, PaymentStatus, Assessment } from '../types';

// Mock Data Generators

export const mockStudents: Student[] = [
  { id: '1', name: '王小明', phone: '0912-345-678', birthday: '2015-05-20', gender: 'Male', type: 'A', default_fee: 1200, status: StudentStatus.ACTIVE, tags: ['注意力', '過動'], created_at: '2023-01-01' },
  { id: '2', name: '李小花', phone: '0922-333-444', birthday: '2016-08-15', gender: 'Female', type: 'B', default_fee: 1000, status: StudentStatus.ACTIVE, tags: ['早療'], created_at: '2023-02-15' },
  { id: '3', name: '陳大文', phone: '0911-222-333', birthday: '2014-11-11', gender: 'Male', type: 'C', default_fee: 1500, status: StudentStatus.PENDING, tags: ['評估中'], created_at: '2023-10-01' },
];

export const mockScheduleSlots: ScheduleSlot[] = [
  { id: 's1', student_id: '1', weekday: 1, time_slot: '15:00 - 17:00', note: '固定週一' },
  { id: 's2', student_id: '1', weekday: 4, time_slot: '17:00 - 19:00', note: '固定週四' },
  { id: 's3', student_id: '2', weekday: 2, time_slot: '13:00 - 15:00', note: '固定週二' },
];

export const mockSessions: Session[] = [
  { 
    id: 'ses1', 
    student_id: '1', 
    session_date: '2023-10-23', 
    time_slot: '15:00 - 17:00', 
    attendance: AttendanceStatus.PRESENT, 
    teacher_name: 'Teacher A',
    performance_log: '今日專注力較佳，視覺追蹤練習完成度80%，但聽覺指令需要重複兩次。',
    pc_summary: '【PC Summary】\n個案今日視覺表現穩定，建議回家多做追視練習。\n聽覺部分家長可嘗試簡化指令。'
  },
  { 
    id: 'ses2', 
    student_id: '1', 
    session_date: '2023-10-26', 
    time_slot: '17:00 - 19:00', 
    attendance: AttendanceStatus.ABSENT, 
    note: '事假', 
    teacher_name: 'Teacher A' 
  },
  {
    id: 'ses3',
    student_id: '2',
    session_date: '2023-10-24',
    time_slot: '13:00 - 15:00',
    attendance: AttendanceStatus.PRESENT,
    teacher_name: 'Teacher B',
    performance_log: '情緒穩定，大動作協調性有進步。',
  }
];

export const mockPayments: Payment[] = [
  { id: 'p1', student_id: '1', amount: 4800, status: PaymentStatus.UNPAID, sessions_count: 4, month_ref: '2023-10', note: '10月學費' },
  { id: 'p2', student_id: '2', amount: 4000, status: PaymentStatus.PAID, paid_at: '2023-10-05', method: 'Transfer', invoice_no: 'AB-12345678', sessions_count: 4, month_ref: '2023-10' },
  { id: 'p3', student_id: '1', amount: 4800, status: PaymentStatus.CLOSED, paid_at: '2023-09-05', method: 'Cash', sessions_count: 4, month_ref: '2023-09', note: '9月學費' },
];

export const mockAssessments: Assessment[] = [
  { 
    id: 'a1', 
    student_id: '1', 
    assessed_at: '2023-09-01', 
    scoring_system: 'LEC-Standard', 
    summary: '基礎能力建立期', 
    metrics: { 
      visual_age: "4-6", 
      auditory_age: "5-0", 
      kinetic_age: "4-0",
      note: "視動整合需加強"
    } 
  },
  { 
    id: 'a2', 
    student_id: '1', 
    assessed_at: '2023-06-01', 
    scoring_system: 'LEC-Standard', 
    summary: '初次評估', 
    metrics: { 
      visual_age: "4-0", 
      auditory_age: "4-5", 
      kinetic_age: "3-5" 
    } 
  }
];

// Helper to get day of week (1=Mon, 7=Sun)
export const getDayOfWeek = (dateStr: string): number => {
  const day = new Date(dateStr).getDay();
  return day === 0 ? 7 : day;
};
