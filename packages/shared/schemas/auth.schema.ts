import { z } from "zod";

/**
 * Payload đăng nhập của quản trị viên.
 * Dùng chung: FE validate form, BE validate request body (nestjs-zod).
 */
export const loginSchema = z.object({
  /** Tên đăng nhập (so khớp không phân biệt hoa thường ở backend) */
  username: z.string().min(1, "Vui lòng nhập tên đăng nhập."),
  /** Mật khẩu dạng plaintext, chỉ tồn tại trong request đăng nhập */
  password: z.string().min(1, "Vui lòng nhập mật khẩu."),
});

/** Kiểu payload đăng nhập đã validate. */
export type LoginInput = z.infer<typeof loginSchema>;

/** Payload xin cặp token mới khi accessToken đã hết hạn. */
export const refreshTokenSchema = z.object({
  /** Refresh token còn hạn lấy từ lần đăng nhập/refresh trước */
  refreshToken: z.string().min(1, "Thiếu refresh token."),
});

/** Kiểu payload refresh đã validate. */
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
