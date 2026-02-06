-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_ScheduleSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "student_id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "effective_from" DATETIME,
    "note" TEXT,
    CONSTRAINT "ScheduleSlot_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

WITH cleaned AS (
    SELECT
      "id",
      "student_id",
      "weekday",
      REPLACE("time_slot", ' ', '') AS normalized,
      "effective_from",
      "note"
    FROM "ScheduleSlot"
)
INSERT INTO "new_ScheduleSlot" ("id", "student_id", "weekday", "start_time", "end_time", "effective_from", "note")
SELECT
  "id",
  "student_id",
  "weekday",
  CASE
    WHEN INSTR(normalized, '-') > 0 THEN SUBSTR(normalized, 1, INSTR(normalized, '-') - 1)
    ELSE normalized
  END AS start_time,
  CASE
    WHEN INSTR(normalized, '-') > 0 THEN SUBSTR(normalized, INSTR(normalized, '-') + 1)
    ELSE normalized
  END AS end_time,
  "effective_from",
  "note"
FROM cleaned;

DROP TABLE "ScheduleSlot";
ALTER TABLE "new_ScheduleSlot" RENAME TO "ScheduleSlot";
CREATE INDEX "ScheduleSlot_student_id_idx" ON "ScheduleSlot"("student_id");

CREATE TABLE "new_Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "student_id" TEXT NOT NULL,
    "session_date" DATETIME NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "attendance" TEXT NOT NULL,
    "teacher_name" TEXT,
    "note" TEXT,
    "performance_log" TEXT,
    "pc_summary" TEXT,
    "attachments" JSONB,
    CONSTRAINT "Session_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

WITH cleaned_session AS (
    SELECT
      "id",
      "student_id",
      "session_date",
      REPLACE("time_slot", ' ', '') AS normalized,
      "attendance",
      "teacher_name",
      "note",
      "performance_log",
      "pc_summary",
      "attachments"
    FROM "Session"
)
INSERT INTO "new_Session" ("id", "student_id", "session_date", "start_time", "end_time", "attendance", "teacher_name", "note", "performance_log", "pc_summary", "attachments")
SELECT
  "id",
  "student_id",
  "session_date",
  CASE
    WHEN INSTR(normalized, '-') > 0 THEN SUBSTR(normalized, 1, INSTR(normalized, '-') - 1)
    ELSE normalized
  END AS start_time,
  CASE
    WHEN INSTR(normalized, '-') > 0 THEN SUBSTR(normalized, INSTR(normalized, '-') + 1)
    ELSE normalized
  END AS end_time,
  "attendance",
  "teacher_name",
  "note",
  "performance_log",
  "pc_summary",
  "attachments"
FROM cleaned_session;

DROP TABLE "Session";
ALTER TABLE "new_Session" RENAME TO "Session";
CREATE INDEX "Session_student_id_idx" ON "Session"("student_id");
CREATE INDEX "Session_session_date_idx" ON "Session"("session_date");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
