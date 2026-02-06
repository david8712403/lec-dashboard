const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 檢查學生與相關資料的關聯
  const students = await prisma.student.findMany({
    include: {
      _count: {
        select: {
          assessments: true,
          payments: true,
          schedules: true,
          sessions: true
        }
      }
    },
    take: 5
  });
  
  console.log('個案關聯資料檢查：\n');
  students.forEach(s => {
    console.log(`${s.name.padEnd(10)} (入室: ${s.created_at.toISOString().split('T')[0]})`);
    console.log(`  檢測: ${s._count.assessments} | 繳費: ${s._count.payments} | 課表: ${s._count.schedules} | 課程: ${s._count.sessions}`);
  });
  
  // 統計總數
  const totalStudents = await prisma.student.count();
  const totalAssessments = await prisma.assessment.count();
  const totalPayments = await prisma.payment.count();
  const totalSchedules = await prisma.scheduleSlot.count();
  
  console.log('\n=== 總計 ===');
  console.log(`個案: ${totalStudents}`);
  console.log(`檢測紀錄: ${totalAssessments}`);
  console.log(`繳費紀錄: ${totalPayments}`);
  console.log(`課程時段: ${totalSchedules}`);
  
  // 檢查是否有孤立資料
  const orphanedAssessments = await prisma.assessment.count({
    where: {
      student: {
        is: null
      }
    }
  });
  
  console.log(`\n❗ 孤立的檢測紀錄（沒有關聯個案）: ${orphanedAssessments}`);
}

main().finally(() => prisma.$disconnect());
