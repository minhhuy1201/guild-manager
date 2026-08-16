import { existsSync } from 'node:fs';

import { config } from 'dotenv';

/** File biến môi trường mặc định khi không chỉ định gì thêm. */
const DEFAULT_ENV_FILE = '.env';

/** Nhãn trả về khi không có file nào để nạp và biến đã nằm sẵn trong môi trường. */
const AMBIENT_ENV_LABEL = 'biến môi trường có sẵn (không có file .env)';

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
 * Trên môi trường build của hosting (Vercel, GitHub Actions) không có file `.env`: biến được
 * tiêm thẳng vào process. Thiếu file ở đó là bình thường, nên hàm dùng luôn biến có sẵn thay vì
 * ném lỗi. Vẫn ném lỗi khi không có cả file lẫn `DATABASE_URL` — đó mới là trường hợp chạy nhầm
 * thư mục mà cảnh báo này sinh ra để bắt.
 *
 * @returns Đường dẫn file đã nạp, hoặc {@link AMBIENT_ENV_LABEL} khi dùng biến có sẵn
 * @throws Error khi file được chỉ định không tồn tại, hoặc không có nguồn biến nào cả
 */
export function loadPrismaEnv(): string {
  const requestedFile = process.env.PRISMA_ENV_FILE;
  const envFile = requestedFile ?? DEFAULT_ENV_FILE;

  if (!existsSync(envFile)) {
    // Chỉ định file rõ ràng mà không thấy thì luôn là lỗi: lặng lẽ quay về biến có sẵn nghĩa là
    // lệnh nhắm production có thể chạy vào database khác hẳn.
    if (requestedFile !== undefined) {
      throw new Error(
        `Không tìm thấy file biến môi trường "${envFile}". ` +
          `Chạy lệnh từ thư mục apps/api, và tạo file từ .env.example nếu chưa có.`,
      );
    }

    if (!process.env.DATABASE_URL) {
      throw new Error(
        `Không tìm thấy file biến môi trường "${envFile}", và cũng không có DATABASE_URL ` +
          `trong môi trường. Chạy lệnh từ thư mục apps/api, và tạo file từ .env.example nếu chưa có.`,
      );
    }

    return AMBIENT_ENV_LABEL;
  }

  // override: true để giá trị trong file được chọn luôn thắng biến đã có sẵn trong shell.
  config({ path: envFile, override: true });

  return envFile;
}
