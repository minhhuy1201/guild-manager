-- Hash scrypt không đọc ngược được nên đổi tên cột xong phải cấp lại mật khẩu mới cho mọi hàng.
ALTER TABLE "Character" RENAME COLUMN "passwordHash" TO "password";

UPDATE "Character" SET "password" = (
  SELECT string_agg(
    substr('abcdefghijkmnpqrstuvwxyz23456789', floor(random() * 32)::int + 1, 1),
    ''
  )
  FROM generate_series(1, 8)
);
