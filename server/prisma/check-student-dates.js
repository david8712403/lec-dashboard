const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({
    select: {
      id: true,
      name: true,
      created_at: true,
      birthday: true
    },
    orderBy: { created_at: 'desc' },
    take: 10
  });
  
  console.log('個案入室時間 (created_at) 前10筆：\n');
  students.forEach(s => {
    console.log(`${s.name.padEnd(10)} | 入室: ${s.created_at.toISOString().split('T')[0]} | 生日: ${s.birthday ? s.birthday.toISOString().split('T')[0] : '未設定'}`);
  });
  
  const withoutDate = await prisma.student.count({
    where: { created_at: null }
  });
  console.log(`\n沒有入室時間的個案數: ${withoutDate}`);
}

main().finally(() => prisma.$disconnect());
