-- CreateTable
CREATE TABLE "LineUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "line_uid" TEXT NOT NULL,
    "display_name" TEXT,
    "picture_url" TEXT,
    "status_message" TEXT,
    "email" TEXT,
    "id_token_payload" JSONB,
    "profile_payload" JSONB,
    "last_login_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LineUserWhitelist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "line_uid" TEXT NOT NULL,
    "note" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "LineUser_line_uid_key" ON "LineUser"("line_uid");

-- CreateIndex
CREATE INDEX "LineUser_line_uid_idx" ON "LineUser"("line_uid");

-- CreateIndex
CREATE UNIQUE INDEX "LineUserWhitelist_line_uid_key" ON "LineUserWhitelist"("line_uid");

-- CreateIndex
CREATE INDEX "LineUserWhitelist_line_uid_idx" ON "LineUserWhitelist"("line_uid");
