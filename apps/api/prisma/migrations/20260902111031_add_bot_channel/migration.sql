-- CreateTable
CREATE TABLE "BotChannel" (
    "purpose" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotChannel_pkey" PRIMARY KEY ("purpose")
);

-- Chặn Data API, lớp thứ hai. REVOKE của 20260802185500_chan_data_api_truy_cap_bang tự áp cho bảng
-- mới nhờ ALTER DEFAULT PRIVILEGES, nhưng RLS thì KHÔNG tự bật — mỗi bảng mới phải tự khai.
-- Không tạo policy nào: bật RLS mà không có policy nghĩa là từ chối tất cả. App kết nối bằng role
-- `postgres` (rolbypassrls = true) nên runtime không bị ảnh hưởng.
ALTER TABLE "BotChannel" ENABLE ROW LEVEL SECURITY;
