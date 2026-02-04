import { Student, ScheduleSlot, Session, Payment, Assessment, StudentStatus, AttendanceStatus, PaymentStatus } from '../types';

// Mock Students
export const MOCK_STUDENTS: Student[] = [
  { id: '1', name: '王小明', phone: '0912-345-678', gender: '男', type: 'A', status: StudentStatus.ACTIVE, tags: ['注意力', '早療'], created_at: '2023-01-01', birthday: '2015-05-20' },
  { id: '2', name: '陳小美', phone: '0922-444-555', gender: '女', type: 'B', status: StudentStatus.PENDING, tags: ['語言'], created_at: '2023-02-15', birthday: '2016-08-10' },
  { id: '3', name: '李大華', phone: '0933-111-222', gender: '男', type: 'C', status: StudentStatus.ACTIVE, tags: ['情緒'], created_at: '2023-03-10', birthday: '2014-12-01' },
];

// Mock Schedule Slots (Fixed Times)
export const MOCK_SLOTS: ScheduleSlot[] = [
  { id: 's1', student_id: '1', weekday: 1, time_slot: '14:00', note: '固定週一' }, // Mon 14:00
  { id: 's2', student_id: '1', weekday: 3, time_slot: '16:00', note: '固定週三' }, // Wed 16:00
  { id: 's3', student_id: '3', weekday: 2, time_slot: '10:00', note: '固定週二' }, // Tue 10:00
  { id: 's4', student_id: '2', weekday: 5, time_slot: '15:00', note: '固定週五' }, // Fri 15:00
];

// Mock Sessions (Actual History/Future)
export const MOCK_SESSIONS: Session[] = [
  // Last week
  { id: 'ses1', student_id: '1', session_date: '2023-10-23', time_slot: '14:00', attendance: AttendanceStatus.PRESENT, teacher_name: 'Teacher A' },
  { id: 'ses2', student_id: '1', session_date: '2023-10-25', time_slot: '16:00', attendance: AttendanceStatus.ABSENT, teacher_name: 'Teacher A', note: '事假' },
  // This week (Assuming base date for demo)
  { id: 'ses3', student_id: '3', session_date: '2023-10-24', time_slot: '10:00', attendance: AttendanceStatus.PRESENT, teacher_name: 'Teacher B' },
];

// Mock Payments
export const MOCK_PAYMENTS: Payment[] = [
  { id: 'p1', student_id: '1', amount: 4000, method: 'Cash', status: PaymentStatus.PAID, sessions_count: 4, created_at: '2023-10-01', paid_at: '2023-10-05', invoice_no: 'INV-001' },
  { id: 'p2', student_id: '1', amount: 4000, method: 'Transfer', status: PaymentStatus.UNPAID, sessions_count: 4, created_at: '2023-11-01' },
  { id: 'p3', student_id: '2', amount: 1500, method: 'Cash', status: PaymentStatus.UNPAID, sessions_count: 1, created_at: '2023-10-15', note: '檢測費' },
];

// Mock Assessments
export const MOCK_ASSESSMENTS: Assessment[] = [
  { 
    id: 'a1', 
    student_id: '1', 
    assessed_at: '2023-01-05', 
    scoring_system: 'CELF-5', 
    summary: '語言理解能力稍弱，表達能力正常。', 
    metrics: { "理解": 85, "表達": 102, "詞彙": 90, "語法": 88 }, 
    created_at: '2023-01-05' 
  },
  { 
    id: 'a2', 
    student_id: '1', 
    assessed_at: '2023-06-05', 
    scoring_system: 'CELF-5', 
    summary: '經過半年課程，理解能力有顯著進步。', 
    metrics: { "理解": 95, "表達": 105, "詞彙": 98, "語法": 92 }, 
    created_at: '2023-06-05' 
  },
  { 
    id: 'a3', 
    student_id: '2', 
    assessed_at: '2023-02-20', 
    scoring_system: 'WPPSI-IV', 
    summary: '整體認知發展在平均範圍內。', 
    metrics: { "語文理解": 110, "視覺空間": 105, "流體推理": 100, "工作記憶": 95, "處理速度": 98 }, 
    created_at: '2023-02-20' 
  }
];

export const getStudentById = (id: string) => MOCK_STUDENTS.find(s => s.id === id);
