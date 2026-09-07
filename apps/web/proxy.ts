import { NextResponse, type NextRequest } from "next/server";
import type { GuildRole } from "@guild/shared/enums";
import type { AuthTokens } from "@guild/shared/schemas";

import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE,
  AUTH_COOKIE_OPTIONS,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_MAX_AGE,
  WEB_AUTH_ERROR,
  decideAccess,
  readJwt,
  refreshRequest,
  type AccessDecision,
} from "@/features/auth/core";
import { ROUTES } from "@/config/routes";

/**
 * Read AUTH_SECRET, complaining loudly when it is missing.
 *
 * Without it no token verifies, so someone who has just signed in is bounced off **every** page, not
 * only the admin ones - a symptom identical to an expired session and easy to chase in the wrong
 * place, which is why the redirect now carries `WEB_AUTH_ERROR.sessionInvalid`. It does not throw
 * because the proxy runs before every page: throwing would answer them all with a stack trace rather
 * than a sentence somebody can act on. `getAuthSecret()` in
 * `features/auth/api/session.ts` deliberately does the opposite (it throws) because a failing Server
 * Component only breaks that one page — do not "fix" the two to match.
 *
 * @returns The JWT signing key, or undefined when unconfigured
 */
function readAuthSecret(): string | undefined {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    console.error(
      "Thiếu biến môi trường AUTH_SECRET — không verify được token, mọi trang đều bị đá về đăng nhập."
    );
  }

  return secret;
}

/**
 * Runs before every page request, doing two things:
 * 1. Refreshing the session — when the access token expired but the refresh token has not, it trades
 *    for a new pair. The proxy is the only place in Next that can write cookies for every request, so
 *    refreshing belongs here rather than in a Server Component.
 * 2. Deciding whether the request goes through and where it is sent otherwise — the default is
 *    **sign-in required**: apart from `/dang-nhap` there is no public page left.
 * @param request - The request being handled
 * @returns The response continuing the request (with new cookies after a refresh), or a redirect
 */
export async function proxy(request: NextRequest) {
  const secret = readAuthSecret();
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  // Without a secret nothing can verify, which is a misconfiguration and not a dead session.
  let isMisconfigured = !secret;

  if (secret) {
    const access = await readJwt(accessToken, secret);
    if (access.status === "valid") {
      return decide(request, access.payload.role, NextResponse.next());
    }

    const refresh = refreshToken ? await readJwt(refreshToken, secret) : null;

    if (refresh?.status === "valid" && refreshToken) {
      const tokens = await refreshRequest(refreshToken).catch(() => null);
      if (tokens) {
        return decide(request, tokens.user.role, renewSession(request, tokens));
      }
    }

    // A token the browser is holding whose signature is not ours. An expired one is an ordinary
    // session ending; this one cannot be fixed by signing in again, because the next token will be
    // signed with the same mismatched secret - which is why it gets a sentence of its own instead of
    // the silent loop it used to produce.
    isMisconfigured =
      (accessToken !== undefined && access.status === "invalid") ||
      (refreshToken !== undefined && refresh?.status === "invalid");
  }

  // Reaching here means there is no usable access token and no way to refresh.
  const response =
    decideAccess({ pathname: request.nextUrl.pathname, role: null }) === "allow"
      ? NextResponse.next()
      : NextResponse.redirect(loginUrl(request, isMisconfigured));

  // Clear the broken/expired cookies so they are not sent again on later requests.
  if (accessToken) response.cookies.delete(ACCESS_TOKEN_COOKIE);
  if (refreshToken) response.cookies.delete(REFRESH_TOKEN_COOKIE);

  return response;
}

/**
 * Apply `decideAccess`'s verdict for a still-usable session.
 * @param request - The request being handled
 * @param role - Role read from the access token
 * @param allowed - Response used when the request goes through (may carry refreshed cookies)
 * @returns The continuing response, or a redirect to the attendance page when unauthorised
 */
function decide(
  request: NextRequest,
  role: GuildRole,
  allowed: NextResponse
): NextResponse {
  const decision: AccessDecision = decideAccess({
    pathname: request.nextUrl.pathname,
    role,
  });

  return decision === "home"
    ? NextResponse.redirect(new URL(ROUTES.attendance, request.url))
    : allowed;
}

/**
 * The login page URL, carrying the path the user was heading to.
 * @param request - The request being handled
 * @param isMisconfigured - Whether the session failed for a reason signing in again cannot fix
 * @returns The absolute login page URL
 */
function loginUrl(request: NextRequest, isMisconfigured: boolean): URL {
  const url = new URL(ROUTES.login, request.url);
  url.searchParams.set("redirect", request.nextUrl.pathname);
  if (isMisconfigured) {
    url.searchParams.set("error", WEB_AUTH_ERROR.sessionInvalid);
  }

  return url;
}

/**
 * Write the refreshed token pair into both the request and the response.
 * Into the request so this render's Server Components read the new token, and into the response so the
 * browser keeps it for later requests.
 * @param request - The request being handled
 * @param tokens - The new token pair issued by the API
 * @returns The continuing response with updated cookies
 */
function renewSession(request: NextRequest, tokens: AuthTokens): NextResponse {
  request.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken);
  request.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken);

  const response = NextResponse.next({ request });
  response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...AUTH_COOKIE_OPTIONS,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...AUTH_COOKIE_OPTIONS,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });

  return response;
}

export const config = {
  // Runs on every page route (static assets excluded) so the session refreshes on any page.
  //
  // `icon.svg` is the App Router metadata file behind the `<link rel="icon">` Next injects. Without
  // it here the proxy answers the browser's favicon request with the login redirect, so no tab ever
  // shows an icon while signed out — the login page included.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|img/).*)"],
};
