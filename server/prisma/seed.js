require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const parseDate = (value) => (value ? new Date(value) : null);

const students = [
  {
    id: '1',
    name: '王小明',
    phone: '0912-345-678',
    birthday: parseDate('2015-05-20'),
    gender: 'Male',
    type: 'A',
    default_fee: 1200,
    status: '進行中',
    tags: ['注意力', '過動'],
    created_at: parseDate('2023-01-01'),
  },
  {
    id: '2',
    name: '李小花',
    phone: '0922-333-444',
    birthday: parseDate('2016-08-15'),
    gender: 'Female',
    type: 'B',
    default_fee: 1000,
    status: '進行中',
    tags: ['早療'],
    created_at: parseDate('2023-02-15'),
  },
  {
    id: '3',
    name: '陳大文',
    phone: '0911-222-333',
    birthday: parseDate('2014-11-11'),
    gender: 'Male',
    type: 'C',
    default_fee: 1500,
    status: '待檢測',
    tags: ['評估中'],
    created_at: parseDate('2023-10-01'),
  },
];

const scheduleSlots = [
  { id: 's1', student_id: '1', weekday: 1, time_slot: '15:00 - 17:00', note: '固定週一' },
  { id: 's2', student_id: '1', weekday: 4, time_slot: '17:00 - 19:00', note: '固定週四' },
  { id: 's3', student_id: '2', weekday: 2, time_slot: '13:00 - 15:00', note: '固定週二' },
];

const sessions = [
  {
    id: 'ses1',
    student_id: '1',
    session_date: parseDate('2023-10-23'),
    time_slot: '15:00 - 17:00',
    attendance: '到課',
    teacher_name: 'Teacher A',
    performance_log: '今日專注力較佳，視覺追蹤練習完成度80%，但聽覺指令需要重複兩次。',
    pc_summary: '【PC Summary】\n個案今日視覺表現穩定，建議回家多做追視練習。\n聽覺部分家長可嘗試簡化指令。',
  },
  {
    id: 'ses2',
    student_id: '1',
    session_date: parseDate('2023-10-26'),
    time_slot: '17:00 - 19:00',
    attendance: '請假',
    note: '事假',
    teacher_name: 'Teacher A',
  },
  {
    id: 'ses3',
    student_id: '2',
    session_date: parseDate('2023-10-24'),
    time_slot: '13:00 - 15:00',
    attendance: '到課',
    teacher_name: 'Teacher B',
    performance_log: '情緒穩定，大動作協調性有進步。',
  },
];

const payments = [
  {
    id: 'p1',
    student_id: '1',
    amount: 4800,
    status: '未繳',
    sessions_count: 4,
    month_ref: '2023-10',
    note: '10月學費',
  },
  {
    id: 'p2',
    student_id: '2',
    amount: 4000,
    status: '已繳',
    paid_at: parseDate('2023-10-05'),
    method: 'Transfer',
    invoice_no: 'AB-12345678',
    sessions_count: 4,
    month_ref: '2023-10',
  },
  {
    id: 'p3',
    student_id: '1',
    amount: 4800,
    status: '已結帳',
    paid_at: parseDate('2023-09-05'),
    method: 'Cash',
    sessions_count: 4,
    month_ref: '2023-09',
    note: '9月學費',
  },
];

const assessments = [
  {
    id: 'a1',
    student_id: '1',
    assessed_at: parseDate('2023-09-01'),
    scoring_system: 'LEC-Standard',
    summary: '基礎能力建立期',
    metrics: {
      visual_age: '4-6',
      auditory_age: '5-0',
      kinetic_age: '4-0',
      note: '視動整合需加強',
    },
  },
  {
    id: 'a2',
    student_id: '1',
    assessed_at: parseDate('2023-06-01'),
    scoring_system: 'LEC-Standard',
    summary: '初次評估',
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
    description: '匯入初始個案資料與課表。',
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
