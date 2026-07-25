/*
  Warnings:

  - You are about to drop the column `gameId` on the `Character` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Character_gameId_key";

-- AlterTable
ALTER TABLE "Character" DROP COLUMN "gameId";
