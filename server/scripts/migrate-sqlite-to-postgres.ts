import 'dotenv/config';
import { PrismaClient as SqliteClient } from '../prisma/generated/sqlite';
import { PrismaClient as PgClient } from '@prisma/client';

const DEFAULT_SQLITE_URL = 'file:./dev.db';
const BATCH_SIZE = 500;

const log = (label: string, value: unknown) => {
  console.log(`\n[${label}]`);
  console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
};

const chunk = <T>(items: T[], size: number) => {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
};

async function insertInBatches<T>(
  label: string,
  rows: T[],
  insert: (batch: T[]) => Promise<unknown>,
) {
  log(`${label} rows`, rows.length);
  for (const [index, batch] of chunk(rows, BATCH_SIZE).entries()) {
    await insert(batch);
    log(`${label} batch`, `${index + 1}/${Math.max(1, Math.ceil(rows.length / BATCH_SIZE))}`);
  }
}

async function run() {
  if (!process.env.SQLITE_DATABASE_URL) {
    process.env.SQLITE_DATABASE_URL = DEFAULT_SQLITE_URL;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Please point it to your Postgres database.');
  }

  if (process.env.DATABASE_URL.startsWith('file:')) {
    throw new Error(
      'DATABASE_URL is pointing to a sqlite file. Please set DATABASE_URL to your Postgres connection string.',
    );
  }

  const sqlite = new SqliteClient();
  const pg = new PgClient();

  try {
    await sqlite.$connect();
    await pg.$connect();

    const existingStudents = await pg.student.count();
    if (existingStudents > 0) {
      throw new Error('Postgres database is not empty. Use a fresh database to avoid duplicates.');
    }

    const [
      students,
      schedules,
      sessions,
      payments,
      assessments,
      activityLogs,
      chatThreads,
      chatItems,
      lineUsers,
      lineUserWhitelist,
    ] = await Promise.all([
      sqlite.student.findMany(),
      sqlite.scheduleSlot.findMany(),
      sqlite.session.findMany(),
      sqlite.payment.findMany(),
      sqlite.assessment.findMany(),
      sqlite.activityLog.findMany(),
      sqlite.chatThread.findMany(),
      sqlite.chatItem.findMany(),
      sqlite.lineUser.findMany(),
      sqlite.lineUserWhitelist.findMany(),
    ]);

    await insertInBatches('Student', students, (batch) =>
      pg.student.createMany({ data: batch, skipDuplicates: true }),
    );
    await insertInBatches('ScheduleSlot', schedules, (batch) =>
      pg.scheduleSlot.createMany({ data: batch, skipDuplicates: true }),
    );
    await insertInBatches('Session', sessions, (batch) =>
      pg.session.createMany({ data: batch, skipDuplicates: true }),
    );
    await insertInBatches('Payment', payments, (batch) =>
      pg.payment.createMany({ data: batch, skipDuplicates: true }),
    );
    await insertInBatches('Assessment', assessments, (batch) =>
      pg.assessment.createMany({ data: batch, skipDuplicates: true }),
    );
    await insertInBatches('ActivityLog', activityLogs, (batch) =>
      pg.activityLog.createMany({ data: batch, skipDuplicates: true }),
    );
    await insertInBatches('ChatThread', chatThreads, (batch) =>
      pg.chatThread.createMany({ data: batch, skipDuplicates: true }),
    );
    await insertInBatches('ChatItem', chatItems, (batch) =>
      pg.chatItem.createMany({ data: batch, skipDuplicates: true }),
    );
    await insertInBatches('LineUser', lineUsers, (batch) =>
      pg.lineUser.createMany({ data: batch, skipDuplicates: true }),
    );
    await insertInBatches('LineUserWhitelist', lineUserWhitelist, (batch) =>
      pg.lineUserWhitelist.createMany({ data: batch, skipDuplicates: true }),
    );

    log('Done', 'SQLite data has been copied into Postgres.');
  } finally {
    await Promise.all([sqlite.$disconnect(), pg.$disconnect()]);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
