-- AlterTable
ALTER TABLE "ChatThread" ADD COLUMN "session_id" TEXT;

-- CreateIndex
CREATE INDEX "ChatThread_session_id_idx" ON "ChatThread"("session_id");
