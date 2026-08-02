-- Chặn Data API (PostgREST) chạm vào bảng của app.
--
-- Supabase expose schema `public` qua Data API và cấp sẵn toàn quyền cho `anon` /
-- `authenticated`. Anon key theo thiết kế là thứ công khai, nên nếu không chặn thì bất kỳ ai
-- cũng đọc/ghi/xoá được dữ liệu mà không đi qua JwtAuthGuard của NestJS.
--
-- App kết nối bằng role `postgres` (rolbypassrls = true) nên RLS không ảnh hưởng tới runtime.
-- Không tạo policy nào: bật RLS mà không có policy nghĩa là từ chối tất cả.

ALTER TABLE "Character" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BattleSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AttendanceRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Formation" ENABLE ROW LEVEL SECURITY;

-- Thu hồi quyền đã cấp trên các bảng hiện có.
REVOKE ALL ON ALL TABLES IN SCHEMA "public" FROM "anon", "authenticated";

-- Và trên mọi bảng tạo về sau: default privileges của schema `public` cấp lại quyền cho hai role
-- này mỗi lần có bảng mới, nên chỉ REVOKE một lần thì migration sau sẽ mở lại lỗ hổng.
ALTER DEFAULT PRIVILEGES IN SCHEMA "public" REVOKE ALL ON TABLES FROM "anon", "authenticated";
ALTER DEFAULT PRIVILEGES IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM "anon", "authenticated";
ALTER DEFAULT PRIVILEGES IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM "anon", "authenticated";
