-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "birthday" DATETIME,
    "gender" TEXT,
    "type" TEXT,
    "default_fee" INTEGER,
    "status" TEXT NOT NULL,
    "tags" JSONB NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ScheduleSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "student_id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "time_slot" TEXT NOT NULL,
    "effective_from" DATETIME,
    "note" TEXT,
    CONSTRAINT "ScheduleSlot_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "student_id" TEXT NOT NULL,
    "session_date" DATETIME NOT NULL,
    "time_slot" TEXT NOT NULL,
    "attendance" TEXT NOT NULL,
    "teacher_name" TEXT,
    "note" TEXT,
    "performance_log" TEXT,
    "pc_summary" TEXT,
    "attachments" JSONB,
    CONSTRAINT "Session_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "student_id" TEXT NOT NULL,
    "paid_at" DATETIME,
    "amount" INTEGER NOT NULL,
    "method" TEXT,
    "status" TEXT NOT NULL,
    "invoice_no" TEXT,
    "sessions_count" INTEGER,
    "month_ref" TEXT,
    "note" TEXT,
    CONSTRAINT "Payment_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "student_id" TEXT NOT NULL,
    "assessed_at" DATETIME NOT NULL,
    "scoring_system" TEXT NOT NULL,
    "summary" TEXT,
    "metrics" JSONB NOT NULL,
    CONSTRAINT "Assessment_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL,
    "category" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "user" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "ScheduleSlot_student_id_idx" ON "ScheduleSlot"("student_id");

-- CreateIndex
CREATE INDEX "Session_student_id_idx" ON "Session"("student_id");

-- CreateIndex
CREATE INDEX "Session_session_date_idx" ON "Session"("session_date");

-- CreateIndex
CREATE INDEX "Payment_student_id_idx" ON "Payment"("student_id");

-- CreateIndex
CREATE INDEX "Assessment_student_id_idx" ON "Assessment"("student_id");

-- CreateIndex
CREATE INDEX "ActivityLog_timestamp_idx" ON "ActivityLog"("timestamp");
