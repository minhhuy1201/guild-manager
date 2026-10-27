-- CreateTable
CREATE TABLE "AutoAttendPeriod" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "enabledAt" TIMESTAMP(3) NOT NULL,
    "disabledAt" TIMESTAMP(3),

    CONSTRAINT "AutoAttendPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AutoAttendPeriod_characterId_idx" ON "AutoAttendPeriod"("characterId");

-- AddForeignKey
ALTER TABLE "AutoAttendPeriod" ADD CONSTRAINT "AutoAttendPeriod_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS like every other table: the Data API is shut out in two layers (see
-- 20260802185500_chan_data_api_truy_cap_bang) and RLS is the one new tables do not inherit.
-- No policy is created, so RLS denies everything; the app connects as `postgres` and bypasses it.
ALTER TABLE "AutoAttendPeriod" ENABLE ROW LEVEL SECURITY;
