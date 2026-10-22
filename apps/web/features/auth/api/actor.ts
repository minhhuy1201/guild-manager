import "server-only";

import { cache } from "react";
import { GuildRole } from "@guild/shared/enums";
import type { Actor } from "@guild/shared/lib";

import { fetchMe } from "./me";
import { getSession, type SessionUser } from "./session";

/** The signed-in user with the role and Grants the API reports today. */
export type SessionActor = SessionUser & Actor;

/**
 * `/auth/me`, read once per render however many components ask: the header, the page and the
 * nav all want it, and each used to cost its own round trip to the API.
 */
export const getMe = cache(fetchMe);

/**
 * The signed-in user as the permission checks see them.
 *
 * The token holds the role it was issued with, which can be a day old. For an Admin or Manager the
 * role and Grants therefore come from `/auth/me`, so a demotion or a revoked Grant changes what a
 * page shows at the next render. A Member has nothing to lose and costs no extra call. When the
 * read fails the user is treated as a Member with no Grants, so a page stays shut rather than open.
 * @returns The user with the role and Grants the API reports, null when signed out
 */
export const getActor = cache(async (): Promise<SessionActor | null> => {
  const session = await getSession();
  if (!session || session.role === GuildRole.MEMBER) return session;

  const me = await getMe();
  if (!me.ok) return { ...session, role: GuildRole.MEMBER };

  return {
    ...session,
    role: me.data.role,
    capabilities: me.data.capabilities,
    grantedCommands: me.data.grantedCommands,
  };
});
