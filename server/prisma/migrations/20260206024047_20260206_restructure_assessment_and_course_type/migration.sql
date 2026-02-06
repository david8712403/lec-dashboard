-- AlterTable
ALTER TABLE "Assessment" ADD COLUMN "status" TEXT;

-- CreateIndex
CREATE INDEX "Assessment_student_id_assessed_at_idx" ON "Assessment"("student_id", "assessed_at");
