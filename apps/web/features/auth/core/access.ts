import type { GuildRole } from "@guild/shared/enums";
import { canManageGuild } from "@guild/shared/lib";

import { ROUTES } from "@/config/routes";

/**
 * The public routes - every other page needs a session. The landing page is one of them on purpose:
 * it is the guild's shopfront, so a visitor who has never signed in has to be able to read it.
 */
const PUBLIC_PATH_PREFIXES = [ROUTES.login, ROUTES.landing];

/** Admin-only routes. */
const ADMIN_PATH_PREFIXES = [ROUTES.teamBuilder, ROUTES.settings];

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
    pathname.startsWith(prefix)
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
