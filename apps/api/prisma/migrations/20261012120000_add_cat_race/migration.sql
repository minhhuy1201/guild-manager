-- CreateEnum
CREATE TYPE "CatRaceMode" AS ENUM ('STANDARD', 'TICKET');

-- CreateEnum
CREATE TYPE "PrizeTier" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateTable
CREATE TABLE "CatRaceEvent" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "mode" "CatRaceMode" NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "discordPostedAt" TIMESTAMP(3),

    CONSTRAINT "CatRaceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatRaceParticipant" (
    "eventId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "tickets" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "CatRaceParticipant_pkey" PRIMARY KEY ("eventId","characterId")
);

-- CreateTable
CREATE TABLE "CatRacePrize" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "tier" "PrizeTier" NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "CatRacePrize_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatRaceEntrant" (
    "prizeId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,

    CONSTRAINT "CatRaceEntrant_pkey" PRIMARY KEY ("prizeId","characterId")
);

-- CreateTable
CREATE TABLE "CatRaceRound" (
    "id" TEXT NOT NULL,
    "prizeId" TEXT NOT NULL,
    "winnerCharacterId" TEXT,
    "winnerName" TEXT NOT NULL,
    "winnerGuildClass" "GuildClass" NOT NULL,
    "winnerTickets" INTEGER NOT NULL,
    "entrantCount" INTEGER NOT NULL,
    "totalTickets" INTEGER NOT NULL,
    "drawnById" TEXT NOT NULL,
    "drawnAt" TIMESTAMP(3) NOT NULL,
    "voidedAt" TIMESTAMP(3),
    "voidReason" VARCHAR(255),

    CONSTRAINT "CatRaceRound_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CatRacePrize_eventId_idx" ON "CatRacePrize"("eventId");

-- CreateIndex
CREATE INDEX "CatRaceRound_prizeId_idx" ON "CatRaceRound"("prizeId");

-- AddForeignKey
ALTER TABLE "CatRaceParticipant" ADD CONSTRAINT "CatRaceParticipant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CatRaceEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatRaceParticipant" ADD CONSTRAINT "CatRaceParticipant_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatRacePrize" ADD CONSTRAINT "CatRacePrize_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CatRaceEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatRaceEntrant" ADD CONSTRAINT "CatRaceEntrant_prizeId_fkey" FOREIGN KEY ("prizeId") REFERENCES "CatRacePrize"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatRaceEntrant" ADD CONSTRAINT "CatRaceEntrant_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatRaceRound" ADD CONSTRAINT "CatRaceRound_prizeId_fkey" FOREIGN KEY ("prizeId") REFERENCES "CatRacePrize"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatRaceRound" ADD CONSTRAINT "CatRaceRound_winnerCharacterId_fkey" FOREIGN KEY ("winnerCharacterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- The app connects as `postgres` (rolbypassrls = true), so runtime is unaffected. No policy is
-- created: RLS without a policy denies everything.
ALTER TABLE "CatRaceEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CatRaceParticipant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CatRacePrize" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CatRaceEntrant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CatRaceRound" ENABLE ROW LEVEL SECURITY;
