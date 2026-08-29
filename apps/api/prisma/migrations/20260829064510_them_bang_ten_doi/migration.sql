-- CreateTable
CREATE TABLE "TeamName" (
    "team" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamName_pkey" PRIMARY KEY ("team")
);

-- Cùng lý do như migration 20260825071500_bat_rls_cho_bang_moi: ALTER DEFAULT PRIVILEGES đã chặn
-- `anon`/`authenticated` với bảng mới, nhưng KHÔNG tự bật RLS. Bảng mới nào cũng phải tự bật,
-- không policy nào cả — bật RLS mà không có policy nghĩa là từ chối tất cả.
ALTER TABLE "TeamName" ENABLE ROW LEVEL SECURITY;
