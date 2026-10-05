-- AlterTable
ALTER TABLE "BattleSession" ADD COLUMN     "formationVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "TeamNameVersion" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TeamNameVersion_pkey" PRIMARY KEY ("id")
);

-- The one row the service reads and bumps; the service never creates it.
INSERT INTO "TeamNameVersion" ("id", "version") VALUES (1, 0);

-- Same two-layer lock-out as 20260925004158_enable_rls_on_tactics: no policy, RLS denies all.
ALTER TABLE "TeamNameVersion" ENABLE ROW LEVEL SECURITY;
