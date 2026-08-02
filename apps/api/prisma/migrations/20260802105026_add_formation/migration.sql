-- CreateTable
CREATE TABLE "Formation" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "assignment" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Formation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Formation_sessionId_key" ON "Formation"("sessionId");

-- CreateIndex
CREATE INDEX "Formation_weekStart_idx" ON "Formation"("weekStart");

-- AddForeignKey
ALTER TABLE "Formation" ADD CONSTRAINT "Formation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "BattleSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
