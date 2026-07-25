import "server-only";

import { cookies } from "next/headers";

import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  signSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "../lib/session-token";

/**
 * Lấy AUTH_SECRET từ biến môi trường, ném lỗi sớm nếu chưa cấu hình.
 * @returns Chuỗi bí mật dùng ký token phiên
 */
export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("Thiếu biến môi trường AUTH_SECRET.");
  }
  return secret;
}

/**
 * Tạo phiên đăng nhập mới và ghi cookie httpOnly.
 * @param username - Tên đăng nhập đã được xác thực
 * @returns Promise hoàn tất khi cookie được ghi
 */
export async function createSession(username: string): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const token = await signSessionToken({ username, exp }, getAuthSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

/**
 * Đọc phiên đăng nhập hiện tại từ cookie và xác thực chữ ký/hạn dùng.
 * @returns Payload phiên nếu hợp lệ, ngược lại null
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return verifySessionToken(
    cookieStore.get(SESSION_COOKIE)?.value,
    getAuthSecret()
  );
}

/**
 * Xóa cookie phiên (đăng xuất).
 * @returns Promise hoàn tất khi cookie bị xóa
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
