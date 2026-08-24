"use server";

import { clearSession } from "./session";

/**
 * Đăng xuất: xóa cookie access/refresh token.
 * Không còn action đăng nhập nào ở đây — luồng đăng nhập là một chuỗi redirect qua Discord,
 * kết thúc ở Route Handler `/dang-nhap/discord`.
 * @returns Promise hoàn tất khi phiên bị hủy
 */
export async function logout(): Promise<void> {
  await clearSession();
}
