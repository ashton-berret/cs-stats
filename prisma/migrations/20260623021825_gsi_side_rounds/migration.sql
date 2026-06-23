-- AlterTable
ALTER TABLE "Match" ADD COLUMN "roundsPlayed" INTEGER;
ALTER TABLE "Match" ADD COLUMN "side" TEXT;

-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN "gsiToken" TEXT;
