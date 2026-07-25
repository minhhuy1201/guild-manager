"use server";

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
 * Xác thực tài khoản quản trị dựa trên biến môi trường ADMIN_USERNAME/ADMIN_PASSWORD,
 * rồi tạo cookie phiên httpOnly nếu hợp lệ.
 * Chạy ở server nên thông tin đăng nhập không bị lộ ra client bundle.
 * @param username - Tên đăng nhập người dùng nhập (so sánh không phân biệt hoa thường)
 * @param password - Mật khẩu người dùng nhập (so sánh chính xác)
 * @returns Kết quả đăng nhập kèm thông báo lỗi nếu thất bại
 */
export async function login(
  username: string,
  password: string
): Promise<LoginResult> {
  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    return {
      success: false,
      message: "Chưa cấu hình tài khoản quản trị trên máy chủ.",
    };
  }

  const matched =
    username.trim().toLowerCase() === expectedUsername.trim().toLowerCase() &&
    password === expectedPassword;

  if (!matched) {
    return {
      success: false,
      message: "Tên đăng nhập hoặc mật khẩu không đúng.",
    };
  }

  await createSession(expectedUsername);
  return { success: true, username: expectedUsername };
}

/**
 * Đăng xuất: xóa cookie phiên quản trị.
 * @returns Promise hoàn tất khi phiên bị hủy
 */
export async function logout(): Promise<void> {
  await clearSession();
}
