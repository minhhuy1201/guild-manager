import { existsSync } from 'node:fs';

import { config } from 'dotenv';

/** File biến môi trường mặc định khi không chỉ định gì thêm. */
const DEFAULT_ENV_FILE = '.env';

/**
 * Nạp file biến môi trường cho các lệnh Prisma CLI (generate/migrate/seed/studio).
 *
 * Đặt `PRISMA_ENV_FILE` để nhắm sang môi trường khác:
 *
 *   PRISMA_ENV_FILE=.env.production pnpm db:seed
 *
 * Chỉ nạp đúng một file, không trộn với `.env`, để lệnh nhắm vào production không bao giờ
 * lỡ nhặt phải connection string local. Đây cũng là lý do không viết
 * `DATABASE_URL=$DIRECT_DATABASE_URL prisma ...`: shell expand biến trước khi dotenv chạy.
 *
 * Cả `prisma.config.ts` lẫn `prisma/seed.ts` đều gọi hàm này. Seed chạy ở process con của
 * Prisma CLI nên không thừa hưởng biến đã nạp ở config — nó phải tự nạp lại đúng file đó.
 *
 * @returns Đường dẫn file đã nạp
 */
export function loadPrismaEnv(): string {
  const envFile = process.env.PRISMA_ENV_FILE ?? DEFAULT_ENV_FILE;

  if (!existsSync(envFile)) {
    throw new Error(
      `Không tìm thấy file biến môi trường "${envFile}". ` +
        `Chạy lệnh từ thư mục apps/api, và tạo file từ .env.example nếu chưa có.`,
    );
  }

  // override: true để giá trị trong file được chọn luôn thắng biến đã có sẵn trong shell.
  config({ path: envFile, override: true });

  return envFile;
}
