import type { GuildRole } from "@guild/shared/enums";
import { canManageGuild } from "@guild/shared/lib";

import { ROUTES } from "@/config/routes";

/**
 * The public routes - every other page needs a session. The landing page is one of them on purpose:
 * it is the guild's shopfront, so a visitor who has never signed in has to be able to read it.
 */
const PUBLIC_PATH_PREFIXES = [ROUTES.login, ROUTES.landing];

/** Admin-only routes. Matched loosely on purpose - see `isUnder`. */
const ADMIN_PATH_PREFIXES = [ROUTES.teamBuilder, ROUTES.settings];

/**
 * Whether a path is the given route or sits under it, matching whole segments only.
 *
 * Used for the public list and **not** for the admin one, and the asymmetry is the point: the two
 * lists fail in opposite directions when a match is too loose. A loose public match makes
 * `/trang-chu-cu` readable without a session - a page opened up by accident. A loose admin match
 * makes `/xep-team-v2` admin-only by accident, which is a door held shut rather than left open.
 * Tightening both would turn the second accident into a route that guards nobody, so only the list
 * that fails open gets tightened.
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
  | "landing"
  /** Signed in but not allowed — send to the attendance page */
  | "home";

/**
 * Decide whether a page request goes through, and where it is sent otherwise.
 *
 * Split out of `proxy.ts` so it is testable without building a NextRequest: the proxy is left reading
 * cookies and translating this verdict into a response.
 * @param input.pathname - Path being requested
 * @param input.role - Role read from the access token, null when signed out
 * @returns The verdict for the request
 */
export function decideAccess({
  pathname,
  role,
}: {
  pathname: string;
  role: GuildRole | null;
}): AccessDecision {
  const isPublic = PUBLIC_PATH_PREFIXES.some((prefix) =>
    isUnder(pathname, prefix)
  );
  if (isPublic) return "allow";

  if (!role) {
    // The root is the address people are given, so a visitor who has never signed in lands on the
    // guild's public page rather than on a login form for an app they know nothing about. Only the
    // root: every other path was asked for deliberately, and sending someone who typed /xep-team to
    // a page about the guild loses where they were going. A member has a session and never gets
    // here, so the week's attendance is still one hop from the bare domain.
    return pathname === ROUTES.attendance ? "landing" : "login";
  }

  const isAdminPath = ADMIN_PATH_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  return isAdminPath && !canManageGuild(role) ? "home" : "allow";
}
