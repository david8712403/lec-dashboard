-- CreateTable
CREATE TABLE "MonthlyReport" (
    "id" TEXT NOT NULL,
    "month_ref" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content_page1" TEXT NOT NULL DEFAULT '',
    "content_page2" TEXT NOT NULL DEFAULT '',
    "content_page3" TEXT NOT NULL DEFAULT '',
    "source_snapshot" JSONB,
    "sync_status" TEXT NOT NULL DEFAULT '未同步',
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyReport_month_ref_key" ON "MonthlyReport"("month_ref");

-- CreateIndex
CREATE INDEX "MonthlyReport_month_ref_idx" ON "MonthlyReport"("month_ref");

-- CreateIndex
CREATE INDEX "MonthlyReport_updated_at_idx" ON "MonthlyReport"("updated_at");
