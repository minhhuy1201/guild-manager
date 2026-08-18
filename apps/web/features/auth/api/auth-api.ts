import type { AuthTokens, LoginInput } from "@shared/schemas";

import { apiFetch } from "@/lib/api-client";

/**
 * Gọi API đăng nhập để lấy cặp token.
 * @param input - Tên đăng nhập và mật khẩu
 * @returns Access token, refresh token và thông tin tài khoản
 * @throws ApiError khi sai thông tin đăng nhập (message tiếng Việt của backend)
 */
export function loginRequest(input: LoginInput): Promise<AuthTokens> {
  return apiFetch<AuthTokens>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Đổi refresh token còn hạn thành cặp token mới.
 * @param refreshToken - Refresh token hiện tại
 * @returns Cặp token mới và thông tin tài khoản
 * @throws ApiError khi refresh token hỏng hoặc đã hết hạn
 */
export function refreshRequest(
  refreshToken: string
): Promise<AuthTokens> {
  return apiFetch<AuthTokens>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}
