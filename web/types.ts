
// Data Models based on the V1 Scope

export enum StudentStatus {
  PENDING = '待檢測',
  ACTIVE = '進行中',
  ESTABLISHED = '成案',
  GRADUATED = '結案',
  PAUSED = '暫停'
}

export type TimeSlot = 
  | '09:00 - 10:40'
  | '10:40 - 12:20'
  | '12:00 - 13:00'
  | '13:00 - 15:00'
  | '15:00 - 17:00'
  | '17:00 - 19:00'
  | '19:00 - 21:00';

export interface Student {
  id: string;
  name: string;
  phone?: string;
  birthday?: string; // YYYY-MM-DD
  gender?: 'Male' | 'Female' | 'Other';
  type?: 'A' | 'B' | 'C';
  default_fee?: number; // New: Default fee per session
  status: StudentStatus;
  tags: string[];
  created_at: string;
}

export interface ScheduleSlot {
  id: string;
  student_id: string;
  weekday: number; // 1 = Monday
  time_slot: TimeSlot;
  effective_from?: string;
  note?: string;
}

export enum AttendanceStatus {
  PRESENT = '到課',
  ABSENT = '請假',
  MAKEUP = '補課',
  CANCELED = '停課',
  UNKNOWN = '未登記'
}

export interface Session {
  id: string;
  student_id: string;
  session_date: string; // YYYY-MM-DD
  time_slot: TimeSlot;
  attendance: AttendanceStatus;
  teacher_name?: string;
  note?: string; // Short administrative note
  performance_log?: string; // New: Detailed daily observation
  pc_summary?: string; // New: Generated PC summary
  attachments?: string[]; // URLs or Base64 of scanned documents
}

export enum PaymentStatus {
  UNPAID = '未繳',
  PAID = '已繳',
  CLOSED = '已結帳'
}

export interface Payment {
  id: string;
  student_id: string;
  paid_at?: string;
  amount: number;
  method?: 'Cash' | 'Transfer' | 'Card';
  status: PaymentStatus;
  invoice_no?: string;
  sessions_count?: number;
  month_ref?: string; // YYYY-MM for grouping
  note?: string;
}

export interface Assessment {
  id: string;
  student_id: string;
  assessed_at: string;
  scoring_system: string;
  summary?: string;
  // Standardized metrics for LEC using "Y-M" format
  metrics: {
    visual_age?: string;   // e.g., "4-6"
    auditory_age?: string; // e.g., "5-0"
    kinetic_age?: string;   // e.g., "3-11"
    [key: string]: any;
  }; 
}

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  category: '個案' | '繳費' | '課程';
  action: string;
  description: string;
  user: string;
}

// UI State Types
export type ViewState = 'STUDENTS' | 'SCHEDULE' | 'PAYMENTS' | 'DAILY_LOGS' | 'ACTIVITY_LOG';
