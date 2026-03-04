-- AlterTable
ALTER TABLE "Session"
  ADD COLUMN "record_status" TEXT NOT NULL DEFAULT '待紀錄',
  ADD COLUMN "completed_at" TIMESTAMP(3),
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "Session_student_id_session_date_start_time_end_time_key"
ON "Session"("student_id", "session_date", "start_time", "end_time");
