-- CreateEnum
CREATE TYPE "GuildRole" AS ENUM ('ADMIN', 'LEADER', 'MEMBER');

-- AlterTable
ALTER TABLE "AttendanceRecord" ADD COLUMN     "markedByCharacterId" TEXT;

-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "discordId" TEXT,
ADD COLUMN     "discordUsername" TEXT,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "role" "GuildRole" NOT NULL DEFAULT 'MEMBER';

-- CreateTable
CREATE TABLE "AuthExchange" (
    "id" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthExchange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuthExchange_expiresAt_idx" ON "AuthExchange"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Character_discordId_key" ON "Character"("discordId");
