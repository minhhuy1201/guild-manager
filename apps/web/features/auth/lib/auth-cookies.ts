/**
 * Tên và cấu hình cookie giữ JWT.
 * Token nằm trong cookie httpOnly nên JS phía client không đọc được (chống XSS);
 * file này không import `next/headers` để proxy (Edge) dùng lại được.
 */

/** Cookie chứa access token (hạn 1 ngày). */
export const ACCESS_TOKEN_COOKIE = "access_token";

/** Cookie chứa refresh token (hạn 1 tuần). */
export const REFRESH_TOKEN_COOKIE = "refresh_token";

/** Tuổi cookie access token (giây) — khớp hạn token do backend ký. */
export const ACCESS_TOKEN_MAX_AGE = 60 * 60 * 24;

/** Tuổi cookie refresh token (giây) — khớp hạn token do backend ký. */
export const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 7;

/** Cặp token nhận từ API sau khi đăng nhập hoặc refresh. */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** Options chung cho cả hai cookie token. */
export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;
