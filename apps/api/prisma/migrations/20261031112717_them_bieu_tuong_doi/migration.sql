-- CreateEnum
CREATE TYPE "TeamIcon" AS ENUM ('CASTLE', 'SWORDS', 'SHIELD', 'FOOTPRINTS', 'EYE', 'TRUCK', 'TOP_LANE', 'MID_LANE', 'BOT_LANE');

-- CreateTable
CREATE TABLE "TeamIconChoice" (
    "team" INTEGER NOT NULL,
    "icon" "TeamIcon" NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamIconChoice_pkey" PRIMARY KEY ("team")
);

-- Cùng lý do như migration 20260829064510_them_bang_ten_doi: bảng mới phải tự bật RLS, không policy
-- nào cả - bật RLS mà không có policy nghĩa là từ chối tất cả.
ALTER TABLE "TeamIconChoice" ENABLE ROW LEVEL SECURITY;
