import type { BattleSession } from "@guild/shared/schemas";

/**
 * Whether saving this match count would destroy a formation: the day would be played over fewer
 * matches than it already has formations laid out for.
 *
 * A pure function rather than a check buried in the form, because it is the one rule here worth
 * testing on its own — the rest of the form is wiring.
 * @param session - Session being edited, null while creating (nothing to lose yet)
 * @param matchCount - Match count about to be saved
 * @returns true when the admin has to confirm before the request goes out
 */
export function willDropFormation(
  session: Pick<BattleSession, "formationMatchCount"> | null,
  matchCount: number
): boolean {
  return session !== null && matchCount < session.formationMatchCount;
}
