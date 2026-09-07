-- Postgres thường không có hai role `anon` / `authenticated` như Supabase, nên migration
-- `20260802185500_chan_data_api_truy_cap_bang` (REVOKE quyền của Data API) fail với
-- `role "anon" does not exist` khi chạy trên database local trống.
--
-- Tạo sẵn hai role NOLOGIN để migration replay được y hệt production. Chỉ dùng cho dev:
-- file này chạy một lần lúc initdb của container, không có trong database thật.
CREATE ROLE "anon" NOLOGIN;
CREATE ROLE "authenticated" NOLOGIN;
