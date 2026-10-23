import { ROUTES } from "@/config/routes";

/**
 * The public routes - every other page needs a session. The landing page is one of them on purpose:
 * it is the guild's shopfront, so a visitor who has never signed in has to be able to read it.
 */
const PUBLIC_PATH_PREFIXES = [ROUTES.login, ROUTES.landing];

/**
 * Whether a path is the given route or sits under it, matching whole segments only.
 *
 * A loose public match would make `/trang-chu-cu` readable without a session - a page opened up by
 * accident - so the public list matches whole segments only.
 *
 * Whole segments still cover the one nested route that needs it: `/dang-nhap/discord` under
 * `/dang-nhap`.
 * @param pathname - Path being requested
 * @param prefix - Route to test it against
 * @returns Whether the path is that route or lives under it
 */
function isUnder(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** The verdict for a page request. */
export type AccessDecision =
  /** Let it through */
  | "allow"
  /** Send to the login page (carrying a return redirect) */
  | "login"
  /** Signed out at the site's root - send to the guild's public page */
  | "landing";

/**
 * Decide whether a page request goes through, and where it is sent otherwise.
 *
 * Split out of `proxy.ts` so it is testable without building a NextRequest: the proxy is left reading
 * cookies and translating this verdict into a response.
 * @param input.pathname - Path being requested
 * @param input.isSignedIn - Whether the request carries a usable session. Its role is not an input:
 * a token's role is too old to judge what a page may show.
 * @returns The verdict for the request
 */
export function decideAccess({
  pathname,
  isSignedIn,
}: {
  pathname: string;
  isSignedIn: boolean;
}): AccessDecision {
  const isPublic = PUBLIC_PATH_PREFIXES.some((prefix) =>
    isUnder(pathname, prefix)
  );
  if (isPublic) return "allow";

  if (!isSignedIn) {
    // The root is the address people are given, so a visitor who has never signed in lands on the
    // guild's public page rather than on a login form for an app they know nothing about. Only the
    // root: every other path was asked for deliberately, and sending someone who typed /xep-team to
    // a page about the guild loses where they were going. A member has a session and never gets
    // here, so the week's attendance is still one hop from the bare domain.
    return pathname === ROUTES.attendance ? "landing" : "login";
  }

  // Signed in is all the proxy judges. The token's role can be a day old, so deciding management
  // routes here would turn away a Member promoted since the token was issued; the page checks the
  // Capability against /auth/me instead.
  return "allow";
}
