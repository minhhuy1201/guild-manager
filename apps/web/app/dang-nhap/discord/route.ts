import { NextResponse, type NextRequest } from "next/server";

import { ROUTES } from "@/config/routes";
import { createSession } from "@/features/auth/server";
import { exchangeRequest } from "@/features/auth/core";

/** Error code appended to `/dang-nhap` when the code cannot be traded for tokens. */
const EXPIRED_ERROR = "phien-het-han";

/**
 * Route "/dang-nhap/discord" — takes the exchange code the API put on the URL, gets the token pair
 * and writes the session cookies.
 *
 * A Route Handler rather than a page: a Server Component cannot write cookies.
 * @param request - Request carrying `?exchange=` and `?redirect=`
 * @returns A redirect to the page the user wanted, or to the login page with an error code
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const code = request.nextUrl.searchParams.get("exchange");
  const redirect =
    request.nextUrl.searchParams.get("redirect") ?? ROUTES.attendance;

  const tokens = code ? await exchangeRequest(code).catch(() => null) : null;
  if (!tokens) {
    return NextResponse.redirect(
      new URL(`${ROUTES.login}?error=${EXPIRED_ERROR}`, request.url)
    );
  }

  await createSession(tokens);

  // Relative paths only — the same reason as `safeRedirect` on the API.
  const target =
    redirect.startsWith("/") && !redirect.startsWith("//")
      ? redirect
      : ROUTES.attendance;

  return NextResponse.redirect(new URL(target, request.url));
}
