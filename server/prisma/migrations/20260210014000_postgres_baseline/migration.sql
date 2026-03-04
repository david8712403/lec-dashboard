-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "birthday" TIMESTAMP(3),
    "gender" TEXT,
    "type" TEXT,
    "course_type" TEXT,
    "grade" TEXT,
    "default_fee" INTEGER,
    "status" TEXT NOT NULL,
    "tags" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleSlot" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "effective_from" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "ScheduleSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "session_date" TIMESTAMP(3) NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "attendance" TEXT NOT NULL,
    "teacher_name" TEXT,
    "note" TEXT,
    "performance_log" TEXT,
    "pc_summary" TEXT,
    "attachments" JSONB,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "paid_at" TIMESTAMP(3),
    "amount" INTEGER NOT NULL,
    "method" TEXT,
    "status" TEXT NOT NULL,
    "invoice_status" TEXT,
    "invoice_no" TEXT,
    "sessions_count" INTEGER,
    "month_ref" TEXT,
    "note" TEXT,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "assessed_at" TIMESTAMP(3) NOT NULL,
    "scoring_system" TEXT NOT NULL,
    "summary" TEXT,
    "status" TEXT,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "metrics" JSONB NOT NULL,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "user" TEXT NOT NULL,
    "line_uid" TEXT,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatThread" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "session_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatItem" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" JSONB NOT NULL,

    CONSTRAINT "ChatItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineUser" (
    "id" TEXT NOT NULL,
    "line_uid" TEXT NOT NULL,
    "display_name" TEXT,
    "line_display_name" TEXT,
    "system_display_name" TEXT,
    "picture_url" TEXT,
    "status_message" TEXT,
    "email" TEXT,
    "id_token_payload" JSONB,
    "profile_payload" JSONB,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LineUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineUserWhitelist" (
    "id" TEXT NOT NULL,
    "line_uid" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LineUserWhitelist_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "Assessment_student_id_assessed_at_idx" ON "Assessment"("student_id", "assessed_at");

-- CreateIndex
CREATE INDEX "Assessment_stars_idx" ON "Assessment"("stars");

-- CreateIndex
CREATE INDEX "ActivityLog_timestamp_idx" ON "ActivityLog"("timestamp");

-- CreateIndex
CREATE INDEX "ActivityLog_line_uid_idx" ON "ActivityLog"("line_uid");

-- CreateIndex
CREATE INDEX "ChatThread_created_at_idx" ON "ChatThread"("created_at");

-- CreateIndex
CREATE INDEX "ChatThread_session_id_idx" ON "ChatThread"("session_id");

-- CreateIndex
CREATE INDEX "ChatItem_thread_id_created_at_idx" ON "ChatItem"("thread_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "LineUser_line_uid_key" ON "LineUser"("line_uid");

-- CreateIndex
CREATE INDEX "LineUser_line_uid_idx" ON "LineUser"("line_uid");

-- CreateIndex
CREATE UNIQUE INDEX "LineUserWhitelist_line_uid_key" ON "LineUserWhitelist"("line_uid");

-- CreateIndex
CREATE INDEX "LineUserWhitelist_line_uid_idx" ON "LineUserWhitelist"("line_uid");

-- AddForeignKey
ALTER TABLE "ScheduleSlot" ADD CONSTRAINT "ScheduleSlot_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatItem" ADD CONSTRAINT "ChatItem_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "ChatThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
