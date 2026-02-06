/**
 * import-from-notion.js
 *
 * 從 Notion 完整匯入個案、檢測紀錄、繳費紀錄、課程時段資料
 *
 * 使用方法:
 * 1. 確保已安裝 Notion SDK: npm install @notionhq/client
 * 2. 設定環境變數 NOTION_API_KEY
 * 3. 執行: node prisma/import-from-notion.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Client } = require('@notionhq/client');
const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const prisma = new PrismaClient();

// Notion 數據庫 ID
const DATABASES = {
  students: '288c93f2-5b7f-8182-b8b4-000b75ee12b0',      // 個案
  assessments: '288c93f2-5b7f-817b-8257-000bd8caa217',  // 檢測紀錄
  payments: '288c93f2-5b7f-81f4-b093-000b1a0ce3e2',     // 繳費紀錄
  schedules: '289c93f2-5b7f-8030-b1c7-000bdbe00572',    // 課程時段
};

// 工具函數：從 Notion 屬性取得文字
function getPlainText(richTextArray) {
  if (!richTextArray || richTextArray.length === 0) return null;
  return richTextArray.map(t => t.plain_text).join('');
}

// 工具函數：從 Notion 屬性取得標題
function getTitle(titleArray) {
  return getPlainText(titleArray);
}

// 工具函數：從 Notion 屬性取得選項
function getSelect(selectObj) {
  return selectObj?.name || null;
}

// 工具函數：從 Notion 屬性取得多選
function getMultiSelect(multiSelectArray) {
  if (!multiSelectArray || multiSelectArray.length === 0) return [];
  return multiSelectArray.map(item => item.name);
}

// 工具函數：從 Notion 屬性取得日期
function getDate(dateObj) {
  if (!dateObj?.start) return null;
  return new Date(dateObj.start);
}

// 工具函數：從 Notion 屬性取得數字
function getNumber(num) {
  return num ?? null;
}

// 工具函數：從 Notion 屬性取得電話
function getPhoneNumber(phone) {
  return phone || null;
}

// 工具函數：從 Notion 屬性取得關聯
function getRelation(relationArray) {
  if (!relationArray || relationArray.length === 0) return [];
  return relationArray.map(r => r.id);
}

// 工具函數：從 Notion 狀態屬性取得狀態值
function getStatus(statusObj) {
  return statusObj?.name || null;
}

// 工具函數：從 Notion 時段字串取得開始/結束時間
function parseTimeSlot(value) {
  if (!value) return { start_time: null, end_time: null };
  const normalized = value.replace(/\s+/g, '');
  const parts = normalized.split('-');
  if (parts.length < 2) return { start_time: null, end_time: null };

  const formatTime = (timeStr) => {
    if (!timeStr) return null;
    if (timeStr.includes(':')) return timeStr;
    if (timeStr.length === 4) return `${timeStr.slice(0, 2)}:${timeStr.slice(2)}`;
    return timeStr;
  };

  return {
    start_time: formatTime(parts[0]),
    end_time: formatTime(parts[1]),
  };
}

// 查詢 Notion 數據庫的所有資料
async function queryNotionDatabase(dataSourceId) {
  const results = [];
  let hasMore = true;
  let startCursor = undefined;

  while (hasMore) {
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: startCursor,
      page_size: 100,
    });

    results.push(...response.results);
    hasMore = response.has_more;
    startCursor = response.next_cursor;
  }

  return results;
}

// 轉換個案資料
function transformStudent(page) {
  const props = page.properties;

  // 狀態映射: Notion 狀態 -> SQLite 狀態
  const statusMap = {
    '進行中': '進行中',
    '離室': '結案',
    '成案': '結案',
    '取消': '結案',
    '送客': '結案',
    '待檢測': '進行中',
    '待諮詢': '進行中',
  };

  // 類型映射: Notion 類型 -> SQLite 類型
  const typeMap = {
    'A超前': 'A',
    'B一般': 'B',
    'C特殊': 'C',
  };

  // 性別映射
  const genderMap = {
    '男': 'Male',
    '女': 'Female',
  };

  const name = getTitle(props['名稱']?.title);
  const phone = getPhoneNumber(props['電話']?.phone_number);
  const birthday = getDate(props['生日']?.date);
  const gender = genderMap[getSelect(props['性別']?.select)] || null;
  const type = typeMap[getSelect(props['類型']?.select)] || null;
  const grade = getSelect(props['目前年級']?.select);
  const status = statusMap[getStatus(props['狀態']?.status)] || '進行中';
  const tags = getMultiSelect(props['標籤']?.multi_select);
  const created_at = getDate(props['加入時間']?.date) || new Date(page.created_time);

  return {
    id: page.id.replace(/-/g, ''),
    name,
    phone,
    birthday,
    gender,
    type,
    grade,
    status,
    tags: JSON.stringify(tags),
    created_at,
  };
}

// 轉換檢測紀錄資料
function transformAssessment(page, studentMap) {
  const props = page.properties;

  // 從關聯中取得學生 ID
  const studentRelations = getRelation(props['🧑🏻‍🎓 個案']?.relation);
  if (studentRelations.length === 0) return null; // 沒有關聯的個案則跳過

  const notionStudentId = studentRelations[0].replace(/-/g, '');
  const studentId = studentMap[notionStudentId];
  if (!studentId) return null; // 找不到對應的學生則跳過

  const assessed_at = getDate(props['日期']?.date);
  if (!assessed_at) return null; // 沒有日期則跳過

  // 狀態映射
  const statusMap = {
    '未測驗': '未測驗',
    '分析中': '分析中',
    '待諮詢': '待諮詢',
    '完成': '完成',
  };

  const status = statusMap[getStatus(props['狀態']?.status)] || '未測驗';
  const scoringSystem = 'LEC-Standard'; // 預設評分系統

  // 建構 metrics JSON - 將小數比例轉換為百分比 (0~100)
  const metrics = {
    visual_ability: getPlainText(props['視覺 能力']?.rich_text),
    auditory_ability: getPlainText(props['聽語  能力']?.rich_text),
    motor_ability: getPlainText(props['感覺動作 能力']?.rich_text),
    visual_ratio: Math.round((getNumber(props['視覺 比例']?.number) || 0) * 100),
    auditory_ratio: Math.round((getNumber(props['聽語 比例']?.number) || 0) * 100),
    motor_ratio: Math.round((getNumber(props['感覺動作 比例']?.number) || 0) * 100),
    academic_ratio: Math.round((getNumber(props['學科 比例']?.number) || 0) * 100),
    course_type: getSelect(props['種類']?.select),
    professional_notes: getPlainText(props['其他課程說明']?.rich_text) || null,
  };

  // 提取星星數作為獨立欄位 (預設為 0)
  const stars = Math.max(0, Math.min(5, Math.round(getNumber(props['本次獲得星星數']?.number) || 0)));

  return {
    id: page.id.replace(/-/g, ''),
    student_id: studentId,
    assessed_at,
    scoring_system: scoringSystem,
    summary: null,
    status,
    stars,
    metrics: JSON.stringify(metrics),
  };
}

// 轉換繳費紀錄資料
function transformPayment(page, studentMap) {
  const props = page.properties;

  // 從關聯中取得學生 ID
  const studentRelations = getRelation(props['🧑🏻‍🎓 個案']?.relation);
  if (studentRelations.length === 0) return null;

  const notionStudentId = studentRelations[0].replace(/-/g, '');
  const studentId = studentMap[notionStudentId];
  if (!studentId) return null;

  // 狀態映射
  const paymentStatusMap = {
    '未繳款': '未繳',
    '已繳款': '已繳',
    '已結帳': '已繳',
  };

  const invoiceStatusMap = {
    '未開立': '未開立',
    '已開立': '已開立',
    '已領取': '已交付',
  };

  // 繳款方式映射
  const methodMap = {
    '現金': '現金',
    '刷卡': '刷卡',
  };

  const paid_at = getDate(props['繳費日期']?.date);
  const amount = getNumber(props['金額']?.number) || 0;
  const method = methodMap[getSelect(props['繳費方式']?.select)] || '現金';
  const status = paymentStatusMap[getStatus(props['繳款狀態']?.status)] || '未繳';
  const invoice_status = invoiceStatusMap[getStatus(props['發票狀態']?.status)] || '未開立';
  const invoice_no = getPlainText(props['發票號碼']?.rich_text);
  const sessions_count = getNumber(props['堂數(手動)']?.number);

  // 從加入時間提取年月作為 month_ref (格式: YYYY-MM)
  let month_ref = null;
  const addTime = getDate(props['加入時間']?.date);
  if (addTime) {
    const year = addTime.getFullYear();
    const month = String(addTime.getMonth() + 1).padStart(2, '0');
    month_ref = `${year}-${month}`;
  }

  return {
    id: page.id.replace(/-/g, ''),
    student_id: studentId,
    paid_at,
    amount,
    method,
    status,
    invoice_status,
    invoice_no,
    sessions_count,
    month_ref,
    note: null,
  };
}

// 轉換課程時段資料
function transformScheduleSlot(page, studentMap) {
  const props = page.properties;

  // 從關聯中取得學生 ID
  const studentRelations = getRelation(props['🧑🏻‍🎓 個案']?.relation);
  if (studentRelations.length === 0) return null;

  const notionStudentId = studentRelations[0].replace(/-/g, '');
  const studentId = studentMap[notionStudentId];
  if (!studentId) return null;

  // 取得星期幾
  const weekdayStr = getSelect(props['週天']?.select);
  const weekdayMap = {
    '週日': 0,
    '週一': 1,
    '週二': 2,
    '週三': 3,
    '週四': 4,
    '週五': 5,
    '週六': 6,
  };
  const weekday = weekdayMap[weekdayStr];
  if (weekday === undefined) return null;

  const timeSlotLabel = getSelect(props['時間']?.select);
  if (!timeSlotLabel) return null;
  const { start_time, end_time } = parseTimeSlot(timeSlotLabel);
  if (!start_time || !end_time) return null;

  const effective_from = getDate(props['套用時間']?.date);
  const note = null; // 沒有備註欄位

  return {
    id: page.id.replace(/-/g, ''),
    student_id: studentId,
    weekday,
    start_time,
    end_time,
    effective_from,
    note,
  };
}

async function main() {
  console.log('🚀 開始從 Notion 匯入資料...\n');

  try {
    // 1. 清空現有資料
    console.log('📝 清空現有資料...');
    await prisma.$transaction([
      prisma.assessment.deleteMany(),
      prisma.payment.deleteMany(),
      prisma.scheduleSlot.deleteMany(),
      prisma.session.deleteMany(),
      prisma.activityLog.deleteMany(),
      prisma.chatItem.deleteMany(),
      prisma.chatThread.deleteMany(),
      prisma.student.deleteMany(),
    ]);
    console.log('✅ 資料已清空\n');

    // 2. 匯入個案資料
    console.log('👥 匯入個案資料...');
    const studentPages = await queryNotionDatabase(DATABASES.students);
    console.log(`   找到 ${studentPages.length} 筆個案資料`);

    const studentMap = {}; // Notion ID -> SQLite ID 映射
    let studentCount = 0;

    for (const page of studentPages) {
      const student = transformStudent(page);
      if (!student.name) continue; // 跳過沒有名稱的資料

      const sqliteId = randomUUID();
      await prisma.student.create({ data: { ...student, id: sqliteId } });
      studentMap[student.id] = sqliteId;
      studentCount++;
      console.log(`   ✓ ${student.name}`);
    }
    console.log(`✅ 已匯入 ${studentCount} 筆個案資料\n`);

    // 3. 匯入檢測紀錄
    console.log('📊 匯入檢測紀錄...');
    const assessmentPages = await queryNotionDatabase(DATABASES.assessments);
    console.log(`   找到 ${assessmentPages.length} 筆檢測紀錄`);

    let assessmentCount = 0;
    for (const page of assessmentPages) {
      const assessment = transformAssessment(page, studentMap);
      if (!assessment) continue;

      await prisma.assessment.create({
        data: { ...assessment, id: randomUUID() },
      });
      assessmentCount++;
    }
    console.log(`✅ 已匯入 ${assessmentCount} 筆檢測紀錄\n`);

    // 4. 匯入繳費紀錄
    console.log('💰 匯入繳費紀錄...');
    const paymentPages = await queryNotionDatabase(DATABASES.payments);
    console.log(`   找到 ${paymentPages.length} 筆繳費紀錄`);

    let paymentCount = 0;
    for (const page of paymentPages) {
      const payment = transformPayment(page, studentMap);
      if (!payment) continue;

      await prisma.payment.create({
        data: { ...payment, id: randomUUID() },
      });
      paymentCount++;
    }
    console.log(`✅ 已匯入 ${paymentCount} 筆繳費紀錄\n`);

    // 5. 匯入課程時段
    console.log('📅 匯入課程時段...');
    const schedulePages = await queryNotionDatabase(DATABASES.schedules);
    console.log(`   找到 ${schedulePages.length} 筆課程時段`);

    let scheduleCount = 0;
    for (const page of schedulePages) {
      const schedule = transformScheduleSlot(page, studentMap);
      if (!schedule) continue;

      await prisma.scheduleSlot.create({
        data: { ...schedule, id: randomUUID() },
      });
      scheduleCount++;
    }
    console.log(`✅ 已匯入 ${scheduleCount} 筆課程時段\n`);

    // 6. 建立初始活動日誌
    await prisma.activityLog.create({
      data: {
        id: randomUUID(),
        timestamp: new Date(),
        category: '系統',
        action: '資料匯入',
        description: `從 Notion 完整匯入資料：個案 ${studentCount} 筆、檢測紀錄 ${assessmentCount} 筆、繳費紀錄 ${paymentCount} 筆、課程時段 ${scheduleCount} 筆`,
        user: 'System',
      },
    });

    console.log('🎉 資料匯入完成！\n');
    console.log('統計資訊：');
    console.log(`   個案: ${studentCount} 筆`);
    console.log(`   檢測紀錄: ${assessmentCount} 筆`);
    console.log(`   繳費紀錄: ${paymentCount} 筆`);
    console.log(`   課程時段: ${scheduleCount} 筆`);

  } catch (error) {
    console.error('❌ 匯入失敗:', error);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
