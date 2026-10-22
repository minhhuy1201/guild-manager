-- CreateEnum
CREATE TYPE "Capability" AS ENUM ('TEAM_BUILDER', 'SCHEDULE', 'MEMBERS', 'ATTENDANCE', 'CAT_RACE', 'TACTICS');

-- CreateEnum
CREATE TYPE "GrantableCommand" AS ENUM ('DIEM_DANH_HO', 'CHAO_MUNG', 'CAU_HINH_KENH', 'THONG_BAO', 'NHAC_DIEM_DANH');

-- AlterEnum
ALTER TYPE "GuildRole" ADD VALUE 'MANAGER';

-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "capabilities" "Capability"[] DEFAULT ARRAY[]::"Capability"[],
ADD COLUMN     "grantedCommands" "GrantableCommand"[] DEFAULT ARRAY[]::"GrantableCommand"[];

