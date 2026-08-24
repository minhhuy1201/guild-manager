import type { AuthTokens } from "@guild/shared/schemas";

import { apiFetch } from "@/lib/api-client";

/**
 * Đổi mã dùng-một-lần (API gắn vào URL sau khi xử lý xong OAuth callback) lấy cặp token.
 * @param code - Giá trị `?exchange=` trên URL callback
 * @returns Cặp token và thông tin phiên
 * @throws ApiError khi mã sai, đã dùng hoặc đã quá hạn
 */
export function exchangeRequest(code: string): Promise<AuthTokens> {
  return apiFetch<AuthTokens>("/auth/discord/exchange", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

/**
 * Đổi refresh token còn hạn thành cặp token mới.
 * @param refreshToken - Refresh token hiện tại
 * @returns Cặp token mới và thông tin phiên
 * @throws ApiError khi refresh token hỏng hoặc đã hết hạn
 */
export function refreshRequest(refreshToken: string): Promise<AuthTokens> {
  return apiFetch<AuthTokens>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}
