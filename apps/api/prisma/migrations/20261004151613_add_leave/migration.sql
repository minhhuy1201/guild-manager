-- CreateTable
CREATE TABLE "Leave" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "reason" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL,
    "createdByCharacterId" TEXT,
    "createdByAdmin" BOOLEAN NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "cancelledByCharacterId" TEXT,
    "cancelledByAdmin" BOOLEAN NOT NULL,

    CONSTRAINT "Leave_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Leave_characterId_idx" ON "Leave"("characterId");

-- CreateIndex
CREATE INDEX "Leave_endDate_idx" ON "Leave"("endDate");

-- AddForeignKey
ALTER TABLE "Leave" ADD CONSTRAINT "Leave_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS like every other table: the Data API is shut out in two layers (see
-- 20260802185500_chan_data_api_truy_cap_bang) and RLS is the one new tables do not inherit.
-- No policy is created, so RLS denies everything; the app connects as `postgres` and bypasses it.
ALTER TABLE "Leave" ENABLE ROW LEVEL SECURITY;
