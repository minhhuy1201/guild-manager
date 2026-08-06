import { existsSync } from 'node:fs';

import { config } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

/**
 * Cấu hình cho Prisma CLI (generate/migrate/seed/studio).
 * Runtime của app không đọc file này — PrismaService tự tạo adapter từ DATABASE_URL.
 */

/** File biến môi trường mặc định khi không chỉ định gì thêm. */
const DEFAULT_ENV_FILE = '.env';

/**
 * File biến môi trường CLI sẽ nạp. Đặt `PRISMA_ENV_FILE` để nhắm sang môi trường khác:
 *
 *   PRISMA_ENV_FILE=.env.production pnpm exec prisma migrate deploy
 *
 * Chỉ nạp đúng một file, không trộn với `.env`, để lệnh nhắm vào production không bao giờ
 * lỡ nhặt phải connection string local. Đây cũng là lý do không viết
 * `DATABASE_URL=$DIRECT_DATABASE_URL prisma ...`: shell expand biến trước khi dotenv chạy.
 */
const envFile = process.env.PRISMA_ENV_FILE ?? DEFAULT_ENV_FILE;

if (!existsSync(envFile)) {
  throw new Error(
    `Không tìm thấy file biến môi trường "${envFile}". ` +
      `Chạy lệnh từ thư mục apps/api, và tạo file từ .env.example nếu chưa có.`,
  );
}

// override: true để giá trị trong file được chọn luôn thắng biến đã có sẵn trong shell.
config({ path: envFile, override: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node prisma/seed.ts',
  },
  datasource: {
    // Ưu tiên DIRECT_DATABASE_URL khi có: migrate cần advisory lock và DDL trong transaction,
    // thứ mà transaction pooler không giữ được. Runtime không đọc file này nên nó vẫn dùng
    // DATABASE_URL — đây là chỗ duy nhất tách được hai đường, vì Prisma 7 bỏ `directUrl`.
    // Không dùng env() cho biến direct: env() ném lỗi khi biến trống, còn ở đây trống là hợp lệ.
    url: process.env.DIRECT_DATABASE_URL || env('DATABASE_URL'),
  },
});
