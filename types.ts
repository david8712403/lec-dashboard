// Enums mirroring database constraints
export enum StudentStatus {
  PENDING = '待檢測',
  ACTIVE = '進行中',
  COMPLETED = '成案',
  ARCHIVED = '送客',
}

export enum AttendanceStatus {
  PRESENT = '到課',
  ABSENT = '請假',
  MAKEUP = '補課',
  CANCELLED = '停課',
}

export enum PaymentStatus {
  UNPAID = '未繳',
  PAID = '已繳',
  CLOSED = '已結帳',
}

// Data Models
export interface Student {
  id: string;
  name: string;
  phone?: string;
  birthday?: string;
  gender?: '男' | '女';
  type?: 'A' | 'B' | 'C';
  status: StudentStatus;
  tags: string[];
  created_at: string;
}

export interface ScheduleSlot {
  id: string;
  student_id: string;
  weekday: number; // 1 (Mon) - 7 (Sun)
  time_slot: string; // "09:00", "10:00"
  effective_from?: string;
  effective_to?: string;
  note?: string;
}

export interface Session {
  id: string;
  student_id: string;
  session_date: string;
  time_slot: string;
  attendance: AttendanceStatus;
  teacher_name?: string;
  note?: string;
}

export interface Payment {
  id: string;
  student_id: string;
  paid_at?: string;
  amount: number;
  method: string;
  status: PaymentStatus;
  invoice_no?: string;
  sessions_count?: number;
  note?: string;
  created_at: string;
}

export interface Assessment {
  id: string;
  student_id: string;
  assessed_at: string;
  scoring_system: string;
  summary?: string;
  metrics: Record<string, any>; // JSONB
  created_at: string;
}

// Helper types for View
export type ViewState = 'students' | 'schedule' | 'payments' | 'assessments' | 'student-detail';
