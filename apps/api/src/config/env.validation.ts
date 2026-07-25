import { z } from 'zod';

/**
 * Schema cho toàn bộ biến môi trường mà API cần.
 * Validate lúc boot để app fail-fast thay vì chết giữa chừng lúc chạy.
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  /** Port của API — mặc định 3001 để không đụng Next.js (3000). */
  PORT: z.coerce.number().int().positive().default(3001),
  /** Connection string PostgreSQL dùng cho Prisma. */
  DATABASE_URL: z.url(),
  /** Origin của frontend, dùng cho CORS. */
  WEB_ORIGIN: z.url().default('http://localhost:3000'),
  /** Khóa ký JWT (access + refresh) — dùng chung giá trị với apps/web để web verify được. */
  AUTH_SECRET: z.string().min(32),
  /** Danh sách tên đăng nhập toàn quyền admin, phân tách bằng dấu phẩy. */
  ADMIN_USERNAMES: z.string().min(1),
  /** Mật khẩu dùng chung cho các tài khoản admin ở trên. */
  ADMIN_PASSWORD: z.string().min(1),
  /** Múi giờ dùng để tính deadline điểm danh (xem docs/attendance-time-rules.md). */
  APP_TIMEZONE: z.string().default('Asia/Ho_Chi_Minh'),
});

/** Kiểu env đã được validate và ép kiểu. */
export type Env = z.infer<typeof envSchema>;

/**
 * Validate biến môi trường lúc khởi động, dùng cho `ConfigModule.forRoot({ validate })`.
 * @param config - Biến môi trường thô lấy từ process.env và các file .env
 * @returns Env đã parse (PORT là number, các giá trị mặc định đã được áp)
 * @throws Error khi thiếu hoặc sai định dạng biến môi trường
 */
export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    const details = z.prettifyError(parsed.error);
    throw new Error(`Biến môi trường không hợp lệ:\n${details}`);
  }

  return parsed.data;
}
