import type { AuthTokens } from "@guild/shared/schemas";

import { apiFetch } from "@/lib/api-client";

/**
 * Trade the one-time code (the API put it on the URL after handling the OAuth callback) for a token pair.
 * @param code - The `?exchange=` value on the callback URL
 * @returns The token pair and session info
 * @throws ApiError when the code is wrong, used, or expired
 */
export function exchangeRequest(code: string): Promise<AuthTokens> {
  return apiFetch<AuthTokens>("/auth/discord/exchange", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

/**
 * Trade a valid refresh token for a new token pair.
 * @param refreshToken - The current refresh token
 * @returns The new token pair and session info
 * @throws ApiError when the refresh token is invalid or expired
 */
export function refreshRequest(refreshToken: string): Promise<AuthTokens> {
  return apiFetch<AuthTokens>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}
