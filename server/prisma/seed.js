require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const parseDate = (value) => (value ? new Date(value) : null);

const students = [
  {
    id: '1',
    name: '廖致勛',
    phone: '0916089912',
    birthday: parseDate('2016-07-25'),
    gender: 'Male',
    type: 'B',
    course_type: null,
    grade: '小三',
    default_fee: null,
    status: '結案',
    tags: [],
    created_at: parseDate('2025-06-19'),
  },
  {
    id: '2',
    name: '陳泯言',
    phone: '0985846498',
    birthday: parseDate('2020-05-19'),
    gender: 'Female',
    type: 'B',
    course_type: null,
    grade: null,
    default_fee: null,
    status: '進行中',
    tags: [],
    created_at: parseDate('2025-12-23'),
  },
  {
    id: '3',
    name: '張詣',
    phone: '0937208224',
    birthday: parseDate('2015-05-18'),
    gender: 'Male',
    type: 'B',
    course_type: null,
    grade: '小四',
    default_fee: null,
    status: '結案',
    tags: [],
    created_at: parseDate('2025-06-13'),
  },
  {
    id: '4',
    name: '李逸騰',
    phone: '0905781105',
    birthday: parseDate('2019-01-06'),
    gender: 'Male',
    type: 'B',
    course_type: null,
    grade: '大班',
    default_fee: null,
    status: '進行中',
    tags: [],
    created_at: parseDate('2025-03-10'),
  },
  {
    id: '5',
    name: '李睿晨',
    phone: '0919056893',
    birthday: parseDate('2016-11-18'),
    gender: 'Male',
    type: 'B',
    course_type: null,
    grade: '小二',
    default_fee: null,
    status: '進行中',
    tags: [],
    created_at: parseDate('2025-02-22'),
  },
  {
    id: '6',
    name: '鄭旭辰',
    phone: null,
    birthday: null,
    gender: 'Male',
    type: 'B',
    course_type: null,
    grade: null,
    default_fee: null,
    status: '進行中',
    tags: [],
    created_at: parseDate('2025-11-28'),
  },
];

const scheduleSlots = [
  { id: 's1', student_id: '4', weekday: 1, start_time: '15:00', end_time: '17:00', note: '固定週一' },
  { id: 's2', student_id: '4', weekday: 4, start_time: '17:00', end_time: '19:00', note: '固定週四' },
  { id: 's3', student_id: '5', weekday: 2, start_time: '13:00', end_time: '15:00', note: '固定週二' },
];

const sessions = [
  {
    id: 'ses1',
    student_id: '4',
    session_date: parseDate('2025-10-23'),
    start_time: '15:00',
    end_time: '17:00',
    attendance: '到課',
    teacher_name: 'Teacher A',
    performance_log: '今日專注力較佳，視覺追蹤練習完成度80%，但聽覺指令需要重複兩次。',
    pc_summary: '【PC Summary】\n個案今日視覺表現穩定，建議回家多做追視練習。\n聽覺部分家長可嘗試簡化指令。',
  },
  {
    id: 'ses2',
    student_id: '4',
    session_date: parseDate('2025-10-26'),
    start_time: '17:00',
    end_time: '19:00',
    attendance: '請假',
    note: '事假',
    teacher_name: 'Teacher A',
  },
  {
    id: 'ses3',
    student_id: '5',
    session_date: parseDate('2025-10-24'),
    start_time: '13:00',
    end_time: '15:00',
    attendance: '到課',
    teacher_name: 'Teacher B',
    performance_log: '情緒穩定，大動作協調性有進步。',
  },
];

const payments = [
  {
    id: 'p1',
    student_id: '4',
    amount: 4800,
    status: '未繳',
    invoice_status: '未開立',
    sessions_count: 4,
    month_ref: '2025-10',
    note: '10月學費',
  },
  {
    id: 'p2',
    student_id: '5',
    amount: 4000,
    status: '已繳',
    invoice_status: '已開立',
    paid_at: parseDate('2025-10-05'),
    method: 'Transfer',
    invoice_no: 'AB-12345678',
    sessions_count: 4,
    month_ref: '2025-10',
  },
  {
    id: 'p3',
    student_id: '4',
    amount: 4800,
    status: '已繳',
    invoice_status: '已交付',
    paid_at: parseDate('2025-09-05'),
    method: 'Cash',
    sessions_count: 4,
    month_ref: '2025-09',
    note: '9月學費',
  },
];

const assessments = [
  {
    id: 'a1',
    student_id: '4',
    assessed_at: parseDate('2025-09-01'),
    scoring_system: 'LEC-Standard',
    summary: '基礎能力建立期',
    stars: 0,
    metrics: {
      visual_age: '4-6',
      auditory_age: '5-0',
      kinetic_age: '4-0',
      note: '視動整合需加強',
    },
  },
  {
    id: 'a2',
    student_id: '4',
    assessed_at: parseDate('2025-06-01'),
    scoring_system: 'LEC-Standard',
    summary: '初次評估',
    stars: 0,
    metrics: {
      visual_age: '4-0',
      auditory_age: '4-5',
      kinetic_age: '3-5',
    },
  },
];

const activities = [
  {
    id: 'log-1',
    timestamp: new Date(),
    category: '個案',
    action: '系統初始化',
    description: '匯入 Notion 個案資料與課表。',
    user: 'System',
  },
];

async function main() {
  await prisma.activityLog.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.session.deleteMany();
  await prisma.scheduleSlot.deleteMany();
  await prisma.student.deleteMany();

  await prisma.student.createMany({ data: students });
  await prisma.scheduleSlot.createMany({ data: scheduleSlots });
  await prisma.session.createMany({ data: sessions });
  await prisma.payment.createMany({ data: payments });
  await prisma.assessment.createMany({ data: assessments });
  await prisma.activityLog.createMany({ data: activities });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
