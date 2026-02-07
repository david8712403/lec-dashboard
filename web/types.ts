
// Data Models based on the V1 Scope

export enum StudentStatus {
  PENDING_TEST = '待檢測',
  PENDING_CONSULT = '待諮詢',
  ACTIVE = '進行中',
  ESTABLISHED = '成案',
  CANCELED = '取消',
  DISMISSED = '送客',
  SEPARATED = '離室',  // NEW
  GRADUATED = '結案',
  PAUSED = '暫停'
}

export interface TimeSlot {
  start_time: string; // HH:mm
  end_time: string;   // HH:mm
}

export interface Student {
  id: string;
  name: string;
  phone?: string;
  birthday?: string; // YYYY-MM-DD
  gender?: 'Male' | 'Female' | 'Other';
  type?: 'A' | 'B' | 'C';
  // course_type REMOVED - now in Assessment.metrics
  grade?: string;
  default_fee?: number;
  status: StudentStatus;
  tags: string[];
  created_at: string;
}

export interface ScheduleSlot {
  id: string;
  student_id: string;
  weekday: number; // 1 = Monday
  start_time: string;
  end_time: string;
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
  start_time: string;
  end_time: string;
  attendance: AttendanceStatus;
  teacher_name?: string;
  note?: string; // Short administrative note
  performance_log?: string; // New: Detailed daily observation
  pc_summary?: string; // New: Generated PC summary
  attachments?: string[]; // URLs or Base64 of scanned documents
}

export enum CourseType {
  HALF_ONE = '半1',
  HUNDRED_TWO = '百2',
  HUNDRED_THREE = '百3',
}

export const COURSE_TYPE_FEES: Record<CourseType, number> = {
  [CourseType.HALF_ONE]: 4950,
  [CourseType.HUNDRED_TWO]: 6600,
  [CourseType.HUNDRED_THREE]: 9900,
};

export const COURSE_TYPE_SESSIONS: Record<CourseType, number> = {
  [CourseType.HALF_ONE]: 4,
  [CourseType.HUNDRED_TWO]: 8,
  [CourseType.HUNDRED_THREE]: 12,
};

export enum PaymentStatus {
  UNPAID = '未繳',
  PAID = '已繳',
}

export enum InvoiceStatus {
  NOT_ISSUED = '未開立',
  ISSUED = '已開立',
  DELIVERED = '已交付',
}

export enum PaymentMethod {
  CASH = '現金',
  CARD = '刷卡',
}

export interface Payment {
  id: string;
  student_id: string;
  paid_at?: string;
  amount: number;
  method?: PaymentMethod;
  status: PaymentStatus;
  invoice_status?: InvoiceStatus;
  invoice_no?: string;
  sessions_count?: number;
  month_ref?: string; // YYYY-MM for grouping
  note?: string;
}

export enum AssessmentStatus {
  NOT_TESTED = '未測驗',
  ANALYZING = '分析中',
  CONSULTING = '待諮詢',
  COMPLETED = '完成',
}

export interface Assessment {
  id: string;
  student_id: string;
  assessed_at: string;
  scoring_system: string;
  summary?: string;
  status?: AssessmentStatus;  // NEW
  stars: number;              // 0-5 rating (independent field for filtering)
  metrics: {
    // NEW: Ability text fields
    visual_ability?: string;      // e.g., "7-7" or "足"
    auditory_ability?: string;    // e.g., "足" or "Y-M" format
    motor_ability?: string;       // e.g., "技-" or "Y-M" format

    // Ratio percentages (0-100 integers)
    visual_ratio?: number;        // 40 = 40%
    auditory_ratio?: number;      // 0 = 0%
    motor_ratio?: number;         // 30 = 30%
    academic_ratio?: number;      // 30 = 30%

    // NEW: Course type (moved from Student)
    course_type?: CourseType;     // '半1', '百2', '百3'

    // NEW: Professional notes
    professional_notes?: string;  // Free-text assessment notes

    // PDF attachment (optional)
    pdf_attachment?: string;      // Base64 encoded PDF

    // BACKWARD COMPATIBILITY: Old age fields
    visual_age?: string;          // e.g., "4-6"
    auditory_age?: string;        // e.g., "5-0"
    kinetic_age?: string;         // e.g., "3-11"
    motor_age?: string;           // e.g., "3-11"

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
  line_uid?: string | null;
  user_picture?: string | null;
  user_display_name?: string | null;
}

// UI State Types
export type ViewState = 'STUDENTS' | 'SCHEDULE' | 'PAYMENTS' | 'DAILY_LOGS' | 'ACTIVITY_LOG';
