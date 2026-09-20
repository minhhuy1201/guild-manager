import "server-only";

import { cookies } from "next/headers";
import type { GuildRole } from "@guild/shared/enums";
import type { AuthTokens } from "@guild/shared/schemas";

import { ApiError } from "@/lib/api-client";

import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE,
  AUTH_COOKIE_OPTIONS,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_MAX_AGE,
  verifyJwt,
} from "../core";

/**
 * The signed-in user, read from the access token.
 * Identity and role only — the bound character must be fetched from `/auth/me` (see `api/me.ts`).
 */
export interface SessionUser {
  /** Discord ID */
  discordId: string;
  /** Guild role */
  role: GuildRole;
}

/**
 * Read AUTH_SECRET from the environment, throwing early when unconfigured.
 * It must match apps/api's AUTH_SECRET, since the backend signs the tokens.
 *
 * Throwing is right here: a failing Server Component only breaks that page. `readAuthSecret()` in
 * `proxy.ts` deliberately does the opposite (it only logs) because the proxy runs before every page —
 * do not "fix" the two to match.
 * @returns The secret used to verify JWTs
 */
export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("Thiếu biến môi trường AUTH_SECRET.");
  }
  return secret;
}

/**
 * Write the token pair into httpOnly cookies.
 * @param tokens - Access and refresh token issued by the API
 * @returns A promise resolving once the cookies are written
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
 * Read the current session from the access token cookie.
 * It does not refresh here because a Server Component cannot write cookies — refreshing is
 * `proxy.ts`'s job.
 * @returns Discord ID and role while the access token is valid, otherwise null
 */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const payload = await verifyJwt(
    cookieStore.get(ACCESS_TOKEN_COOKIE)?.value,
    getAuthSecret()
  );

  if (!payload) return null;

  return { discordId: payload.sub, role: payload.role };
}

/**
 * Read the raw access token from the cookie to call the backend API on the signed-in user's behalf.
 * Server-only (Server Action / Server Component) — the cookie is httpOnly, so the client cannot attach
 * the `Authorization` header itself.
 * @returns The access token when present, otherwise null
 */
export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();

  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
}

/**
 * The `Authorization` header every Server Action sends to the backend.
 *
 * It lives beside `getAccessToken` because it reads the same cookie, and it is shared rather than
 * copied per feature: this file carries `import "server-only"`, not `"use server"`, so a Server
 * Action may import anything from it - which is how `getAccessToken` has always travelled.
 *
 * @returns The prepared Authorization header
 * @throws ApiError 401 when no access token is in the cookies, with the sentence the UI shows
 */
export async function authHeader(): Promise<Record<string, string>> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new ApiError(
      "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.",
      401
    );
  }

  return { Authorization: `Bearer ${accessToken}` };
}

/**
 * Clear both token cookies (sign out).
 * @returns A promise resolving once the cookies are cleared
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
}
