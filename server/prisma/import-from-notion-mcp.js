/**
 * import-from-notion-mcp.js
 *
 * 從 Notion 匯入資料（使用手動提供的 JSON 資料）
 *
 * 使用方法:
 * 1. 從 Notion 匯出資料到 JSON 檔案
 * 2. 執行: node prisma/import-from-notion-mcp.js <students.json> <assessments.json> <payments.json> <schedules.json>
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');
const fs = require('fs');

const prisma = new PrismaClient();

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

// 類型映射
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

    // 手動輸入的資料（從 Notion 複製）
    const studentsData = [
      { name: '廖致勛', phone: '0916089912', birthday: '2016-07-25', gender: '男', type: 'B一般', grade: '小三', status: '離室', created_at: '2025-06-19' },
      { name: '陳泯言', phone: '0985846498', birthday: '2020-05-19', gender: '女', type: 'B一般', grade: null, status: '進行中', created_at: '2025-12-23' },
      { name: '張詣', phone: '0937208224', birthday: '2015-05-18', gender: '男', type: 'B一般', grade: '小四', status: '離室', created_at: '2025-06-13' },
      { name: '李逸騰', phone: '0905781105', birthday: '2019-01-06', gender: '男', type: 'B一般', grade: '大班', status: '進行中', created_at: '2025-03-10' },
      { name: '李睿晨', phone: '0919056893', birthday: '2016-11-18', gender: '男', type: 'B一般', grade: '小二', status: '進行中', created_at: '2025-02-22' },
      { name: '鄭旭辰', phone: null, birthday: null, gender: '男', type: 'B一般', grade: null, status: '進行中', created_at: '2025-11-28' },
    ];

    // 2. 匯入個案資料
    console.log('👥 匯入個案資料...');
    const studentMap = {};
    let studentCount = 0;

    for (const data of studentsData) {
      const student = {
        id: randomUUID(),
        name: data.name,
        phone: data.phone,
        birthday: data.birthday ? new Date(data.birthday) : null,
        gender: genderMap[data.gender] || null,
        type: typeMap[data.type] || 'B',
        grade: data.grade,
        status: statusMap[data.status] || '進行中',
        default_fee: null,
        tags: JSON.stringify([]),
        created_at: data.created_at ? new Date(data.created_at) : new Date(),
      };

      await prisma.student.create({ data: student });
      studentMap[data.name] = student.id;
      studentCount++;
      console.log(`   ✓ ${student.name}`);
    }
    console.log(`✅ 已匯入 ${studentCount} 筆個案資料\n`);

    // 3. 建立初始活動日誌
    await prisma.activityLog.create({
      data: {
        id: randomUUID(),
        timestamp: new Date(),
        category: '系統',
        action: '資料匯入',
        description: `從 Notion 完整匯入資料：個案 ${studentCount} 筆`,
        user: 'System',
      },
    });

    console.log('🎉 資料匯入完成！\n');
    console.log('統計資訊：');
    console.log(`   個案: ${studentCount} 筆`);

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
