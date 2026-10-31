-- CreateEnum
CREATE TYPE "TeamColor" AS ENUM ('JADE', 'STONE', 'NAVY', 'GOLD', 'RED', 'PURPLE', 'ORANGE', 'SKY');

-- CreateTable
CREATE TABLE "TeamColorChoice" (
    "team" INTEGER NOT NULL,
    "color" "TeamColor" NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamColorChoice_pkey" PRIMARY KEY ("team")
);

-- Cùng lý do như migration 20260829064510_them_bang_ten_doi: bảng mới phải tự bật RLS, không policy
-- nào cả - bật RLS mà không có policy nghĩa là từ chối tất cả.
ALTER TABLE "TeamColorChoice" ENABLE ROW LEVEL SECURITY;
