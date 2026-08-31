-- AlterTable
ALTER TABLE "BattleSession" ADD COLUMN     "matchCount" INTEGER NOT NULL DEFAULT 2;

-- Backfill: a day that already has formations knows its own match count. Days with no formation
-- keep the default of 2. Guild War rows correct themselves on the next ensureGuildWar().
UPDATE "BattleSession" s
SET "matchCount" = c.n
FROM (
  SELECT "sessionId", COUNT(*)::int AS n
  FROM "FormationMatch"
  GROUP BY "sessionId"
) c
WHERE c."sessionId" = s.id;
