-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Assessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "student_id" TEXT NOT NULL,
    "assessed_at" DATETIME NOT NULL,
    "scoring_system" TEXT NOT NULL,
    "summary" TEXT,
    "status" TEXT,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "metrics" JSONB NOT NULL,
    CONSTRAINT "Assessment_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Assessment" ("assessed_at", "id", "metrics", "scoring_system", "status", "student_id", "summary") SELECT "assessed_at", "id", "metrics", "scoring_system", "status", "student_id", "summary" FROM "Assessment";
DROP TABLE "Assessment";
ALTER TABLE "new_Assessment" RENAME TO "Assessment";
CREATE INDEX "Assessment_student_id_idx" ON "Assessment"("student_id");
CREATE INDEX "Assessment_student_id_assessed_at_idx" ON "Assessment"("student_id", "assessed_at");
CREATE INDEX "Assessment_stars_idx" ON "Assessment"("stars");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
