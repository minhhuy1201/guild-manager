/**
 * Names and settings of the JWT cookies.
 * The tokens live in httpOnly cookies so client-side JS cannot read them (XSS defence); this file is
 * in `core/` and therefore may not import `next/headers` — the (Edge) proxy reuses it.
 */

/** Cookie holding the access token (1 day). */
export const ACCESS_TOKEN_COOKIE = "access_token";

/** Cookie holding the refresh token (1 week). */
export const REFRESH_TOKEN_COOKIE = "refresh_token";

/** Access token cookie age (seconds) — matches the lifetime the backend signs. */
export const ACCESS_TOKEN_MAX_AGE = 60 * 60 * 24;

/** Refresh token cookie age (seconds) — matches the lifetime the backend signs. */
export const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 7;

/** Shared options for both token cookies. */
export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;
