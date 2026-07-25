-- CreateEnum
CREATE TYPE "GuildClass" AS ENUM ('CUU_LINH', 'HUYET_HA', 'LONG_NGAM', 'THAN_TUONG', 'THIET_Y', 'TOAI_MONG', 'TO_VAN');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('CO', 'KHONG');

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "guildClass" "GuildClass" NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleSession" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "isGuildWar" BOOLEAN NOT NULL DEFAULT false,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BattleSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Character_gameId_key" ON "Character"("gameId");

-- CreateIndex
CREATE INDEX "Character_guildClass_idx" ON "Character"("guildClass");

-- CreateIndex
CREATE INDEX "BattleSession_weekStart_idx" ON "BattleSession"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "BattleSession_weekStart_label_key" ON "BattleSession"("weekStart", "label");

-- CreateIndex
CREATE INDEX "AttendanceRecord_sessionId_idx" ON "AttendanceRecord"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_characterId_sessionId_key" ON "AttendanceRecord"("characterId", "sessionId");

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "BattleSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
