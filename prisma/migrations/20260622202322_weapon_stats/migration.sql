-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN "steamId64" TEXT;

-- CreateTable
CREATE TABLE "WeaponStatSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "steamId64" TEXT NOT NULL,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" TEXT NOT NULL,
    CONSTRAINT "WeaponStatSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "WeaponStatSnapshot_userId_capturedAt_idx" ON "WeaponStatSnapshot"("userId", "capturedAt");
