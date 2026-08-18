import { z } from "zod";

import { ADMIN_ROLE } from "../enums/role.enum";

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

/** Thông tin tài khoản API trả về — không bao giờ chứa mật khẩu. */
export const authUserSchema = z.object({
  /** Tên đăng nhập đã chuẩn hóa chữ thường */
  username: z.string(),
  /** Quyền của tài khoản */
  role: z.literal(ADMIN_ROLE),
});

/** Cặp token phát ra sau khi đăng nhập hoặc refresh thành công. */
export const authTokensSchema = z.object({
  /** Token dùng cho các request cần xác thực (hạn 1 ngày) */
  accessToken: z.string(),
  /** Token dùng để xin cặp token mới (hạn 1 tuần) */
  refreshToken: z.string(),
  /** Tài khoản ứng với cặp token này */
  user: authUserSchema,
});

/** Kiểu thông tin tài khoản API trả về. */
export type AuthUser = z.infer<typeof authUserSchema>;

/** Kiểu cặp token API trả về. */
export type AuthTokens = z.infer<typeof authTokensSchema>;
