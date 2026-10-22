import "server-only";

import type { Actor } from "@guild/shared/lib";
import { GuildRole } from "@guild/shared/enums";

import { fetchMe } from "./me";
import { getSession, type SessionUser } from "./session";

/** The signed-in user with the Grants their role carries. */
export type SessionActor = SessionUser & Actor;

/**
 * The signed-in user as the permission checks see them.
 *
 * The token holds the role only, so a Manager's Grants are read from the API on this request: a
 * Grant taken away stops opening pages as soon as the page is requested again. Admin and Member
 * cost no extra call. When the read fails the Manager keeps no Grant, so the page stays shut.
 * @returns The user with their Grants, null when signed out
 */
export async function getActor(): Promise<SessionActor | null> {
  const session = await getSession();
  if (!session || session.role !== GuildRole.MANAGER) return session;

  const me = await fetchMe();
  if (!me.ok) return session;

  return {
    ...session,
    capabilities: me.data.capabilities,
    grantedCommands: me.data.grantedCommands,
  };
}
