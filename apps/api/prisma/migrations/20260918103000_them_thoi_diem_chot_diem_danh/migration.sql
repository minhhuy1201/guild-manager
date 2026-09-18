-- AlterTable
-- Nullable with no default and no backfill: every existing row is a day nobody announced through
-- the new button, and NULL is exactly that state — attendance still governed by `deadline` alone.
ALTER TABLE "BattleSession" ADD COLUMN     "attendanceClosedAt" TIMESTAMP(3);
