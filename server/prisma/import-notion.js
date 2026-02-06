/**
 * import-notion.js
 *
 * Upserts the 6 students extracted from the Notion "個案" database into SQLite.
 * Does NOT wipe existing data — uses upsert so it is safe to re-run.
 *
 * Usage:  node prisma/import-notion.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

const parseDate = (value) => (value ? new Date(value) : null);

// Mapping rules applied from Notion:
//   狀態: 進行中 → 進行中, 離室 → 結案
//   類型: A超前 → A, B一般 → B, C特殊 → C
//   性別: 男 → Male, 女 → Female
const notionStudents = [
  {
    name: '廖致勛',
    phone: '0916089912',
    birthday: parseDate('2016-07-25'),
    gender: 'Male',
    type: 'B',
    grade: '小三',
    status: '結案',
    created_at: parseDate('2025-06-19'),
  },
  {
    name: '陳泯言',
    phone: '0985846498',
    birthday: parseDate('2020-05-19'),
    gender: 'Female',
    type: 'B',
    grade: null,
    status: '進行中',
    created_at: parseDate('2025-12-23'),
  },
  {
    name: '張詣',
    phone: '0937208224',
    birthday: parseDate('2015-05-18'),
    gender: 'Male',
    type: 'B',
    grade: '小四',
    status: '結案',
    created_at: parseDate('2025-06-13'),
  },
  {
    name: '李逸騰',
    phone: '0905781105',
    birthday: parseDate('2019-01-06'),
    gender: 'Male',
    type: 'B',
    grade: '大班',
    status: '進行中',
    created_at: parseDate('2025-03-10'),
  },
  {
    name: '李睿晨',
    phone: '0919056893',
    birthday: parseDate('2016-11-18'),
    gender: 'Male',
    type: 'B',
    grade: '小二',
    status: '進行中',
    created_at: parseDate('2025-02-22'),
  },
  {
    name: '鄭旭辰',
    phone: null,
    birthday: null,
    gender: 'Male',
    type: 'B',
    grade: null,
    status: '進行中',
    created_at: parseDate('2025-11-28'),
  },
];

async function main() {
  let created = 0;
  let updated = 0;

  for (const s of notionStudents) {
    const existing = await prisma.student.findFirst({ where: { name: s.name } });

    if (existing) {
      await prisma.student.update({
        where: { id: existing.id },
        data: {
          phone: s.phone,
          birthday: s.birthday,
          gender: s.gender,
          type: s.type,
          grade: s.grade,
          status: s.status,
        },
      });
      updated++;
      console.log(`  [updated] ${s.name}`);
    } else {
      await prisma.student.create({
        data: {
          id: randomUUID(),
          name: s.name,
          phone: s.phone,
          birthday: s.birthday,
          gender: s.gender,
          type: s.type,
          grade: s.grade,
          status: s.status,
          tags: [],
          created_at: s.created_at ?? new Date(),
        },
      });
      created++;
      console.log(`  [created] ${s.name}`);
    }
  }

  console.log(`\nNotoin import complete: ${created} created, ${updated} updated.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
