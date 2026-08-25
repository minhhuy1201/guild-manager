import type { GuildRole } from "@guild/shared/enums";
import { canManageGuild } from "@guild/shared/lib";

import { ROUTES } from "@/config/routes";

/** The only public routes — every other page needs a session. */
const PUBLIC_PATH_PREFIXES = [ROUTES.login];

/** Admin-only routes. */
const ADMIN_PATH_PREFIXES = [ROUTES.teamBuilder, ROUTES.settings];

/** The verdict for a page request. */
export type AccessDecision =
  /** Let it through */
  | "allow"
  /** Send to the login page (carrying a return redirect) */
  | "login"
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
  if (!role) return "login";

  const isAdminPath = ADMIN_PATH_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  return isAdminPath && !canManageGuild(role) ? "home" : "allow";
}
