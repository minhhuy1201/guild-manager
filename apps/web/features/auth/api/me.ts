"use server";

import type { SessionUser } from "@guild/shared/schemas";

import { ApiError, apiFetch } from "@/lib/api-client";
import { getAccessToken } from "./session";

/**
 * Đọc thông tin phiên đầy đủ từ backend (vai và nhân vật gắn với tài khoản).
 * Chạy ở server vì access token nằm trong cookie httpOnly — client không tự gắn header được.
 * @returns Discord ID, vai và nhân vật của người đang đăng nhập
 * @throws ApiError khi chưa đăng nhập hoặc phiên đã hết hạn
 */
export async function fetchMe(): Promise<SessionUser> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new ApiError(
      "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.",
      401
    );
  }

  return apiFetch<SessionUser>("/auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
