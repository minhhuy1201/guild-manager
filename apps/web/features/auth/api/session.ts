import "server-only";

import { cookies } from "next/headers";
import type { AuthTokens } from "@shared/schemas";

import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE,
  AUTH_COOKIE_OPTIONS,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_MAX_AGE,
} from "../lib/auth-cookies";
import { verifyJwt } from "../lib/jwt";

/** Thông tin quản trị viên đang đăng nhập, đọc từ access token. */
export interface SessionUser {
  /** Tên đăng nhập */
  username: string;
  /** Quyền của tài khoản */
  role: string;
}

/**
 * Lấy AUTH_SECRET từ biến môi trường, ném lỗi sớm nếu chưa cấu hình.
 * Giá trị phải trùng AUTH_SECRET của apps/api vì backend là bên ký token.
 * @returns Chuỗi bí mật dùng verify JWT
 */
export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("Thiếu biến môi trường AUTH_SECRET.");
  }
  return secret;
}

/**
 * Ghi cặp token vào cookie httpOnly.
 * @param tokens - Access token và refresh token do API phát
 * @returns Promise hoàn tất khi cookie được ghi
 */
export async function createSession(tokens: AuthTokens): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...AUTH_COOKIE_OPTIONS,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  cookieStore.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...AUTH_COOKIE_OPTIONS,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
}

/**
 * Đọc phiên đăng nhập hiện tại từ access token trong cookie.
 * Không tự gia hạn ở đây vì Server Component không ghi được cookie —
 * việc refresh do `proxy.ts` đảm nhiệm.
 * @returns Thông tin tài khoản nếu access token còn hợp lệ, ngược lại null
 */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const payload = await verifyJwt(
    cookieStore.get(ACCESS_TOKEN_COOKIE)?.value,
    getAuthSecret()
  );

  if (!payload) return null;

  return { username: payload.sub, role: payload.role };
}

/**
 * Đọc access token thô từ cookie để gọi API backend thay mặt người đang đăng nhập.
 * Chỉ dùng ở server (Server Action / Server Component) — cookie là httpOnly nên client
 * không tự gắn được header `Authorization`.
 * @returns Access token nếu còn trong cookie, ngược lại null
 */
export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();

  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
}

/**
 * Xóa cả hai cookie token (đăng xuất).
 * @returns Promise hoàn tất khi cookie bị xóa
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
}
