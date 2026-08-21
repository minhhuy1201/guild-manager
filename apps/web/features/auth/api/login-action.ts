"use server";

import { ApiError } from "@/lib/api-client";
import { loginRequest } from "../core";
import { clearSession, createSession } from "./session";

/** Kết quả trả về của action đăng nhập. */
export interface LoginResult {
  /** Đăng nhập thành công hay không */
  success: boolean;
  /** Tên đăng nhập đã xác thực (chỉ có khi thành công) */
  username?: string;
  /** Thông báo lỗi hiển thị cho người dùng (chỉ có khi thất bại) */
  message?: string;
}

/**
 * Đăng nhập qua API backend rồi lưu cặp JWT vào cookie httpOnly.
 * Chạy ở server nên token không bao giờ đi qua JS phía client.
 * @param username - Tên đăng nhập người dùng nhập
 * @param password - Mật khẩu người dùng nhập
 * @returns Kết quả đăng nhập kèm thông báo lỗi tiếng Việt của backend nếu thất bại
 */
export async function login(
  username: string,
  password: string
): Promise<LoginResult> {
  try {
    const tokens = await loginRequest({ username, password });
    await createSession(tokens);

    return { success: true, username: tokens.user.username };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, message: error.message };
    }
    throw error;
  }
}

/**
 * Đăng xuất: xóa cookie access/refresh token.
 * @returns Promise hoàn tất khi phiên bị hủy
 */
export async function logout(): Promise<void> {
  await clearSession();
}
