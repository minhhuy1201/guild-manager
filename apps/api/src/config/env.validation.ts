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
  /**
   * Tên project web trên Vercel — dùng để nhận thêm các domain preview
   * `https://<project>-…vercel.app`. Bỏ trống khi không deploy trên Vercel — khai báo rỗng trong
   * .env cũng tính là bỏ trống.
   */
  WEB_PREVIEW_PROJECT: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined),
  /** Khóa ký JWT (access + refresh) — dùng chung giá trị với apps/web để web verify được. */
  AUTH_SECRET: z.string().min(32),
  /** Client ID của Discord Application (Developer Portal → OAuth2). */
  DISCORD_CLIENT_ID: z.string().min(1),
  /** Client secret của Discord Application — chỉ tồn tại ở API, không bao giờ ở web. */
  DISCORD_CLIENT_SECRET: z.string().min(1),
  /**
   * Redirect URI đã khai trong Discord Developer Portal.
   * Phải khớp từng ký tự, kể cả dấu `/` cuối — Discord từ chối nếu lệch.
   */
  DISCORD_REDIRECT_URI: z.url(),
  /**
   * Danh sách Discord ID cứu hộ, phân tách bằng dấu phẩy.
   * Các ID này luôn đăng nhập được với quyền ADMIN kể cả khi không khớp Character nào —
   * đó là lối vào duy nhất khi database chưa ai được gán Discord ID.
   */
  DISCORD_ADMIN_IDS: z.string().default(''),
  /** Múi giờ dùng để tính deadline điểm danh (xem docs/architecture.md mục 6). */
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
