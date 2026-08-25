-- Bật RLS cho những bảng ra đời sau migration 20260802185500_chan_data_api_truy_cap_bang.
--
-- Migration đó chặn Data API bằng hai lớp: REVOKE quyền của `anon`/`authenticated` (kèm
-- ALTER DEFAULT PRIVILEGES nên bảng mới cũng không được cấp lại), và ENABLE ROW LEVEL SECURITY
-- trên từng bảng. Lớp thứ nhất tự động áp cho bảng mới, lớp thứ hai thì KHÔNG —
-- ALTER DEFAULT PRIVILEGES không bật RLS hộ. Nên ba bảng dưới đây chỉ còn một lớp bảo vệ.
--
-- Riêng "AuthExchange" đáng lo nhất: nó giữ mã đổi dùng-một-lần còn hiệu lực, đọc trộm được một
-- mã trong 60 giây TTL là chiếm được phiên đăng nhập.
--
-- App kết nối bằng role `postgres` (rolbypassrls = true) nên runtime không bị ảnh hưởng.
-- Không tạo policy nào: bật RLS mà không có policy nghĩa là từ chối tất cả.

ALTER TABLE "AuthExchange" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FormationMatch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FormationSlot" ENABLE ROW LEVEL SECURITY;
