import type { SessionFormation } from "../types/session-formation";

/**
 * Whether the user may still rearrange a battle's formation.
 * `locked` comes from the server, which decides it from the battle time and is
 * the real gate — this only adds the read-only rule for past weeks.
 * @param session - The battle, carrying the server's locked flag
 * @param isCurrentWeek - Whether the week on screen is the open one
 * @returns true when the formation may be edited
 */
export function isSessionEditable(
  session: Pick<SessionFormation, "locked">,
  isCurrentWeek: boolean
): boolean {
  return isCurrentWeek && !session.locked;
}
