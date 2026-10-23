import type { BattleSession } from "@guild/shared/schemas";

/** A week's battles split by whether their battle time has passed. */
export interface FoughtSplit<T> {
  /** Battles still to come, in the week's order */
  upcoming: T[];
  /** Battles whose battle time has passed, in the week's order */
  fought: T[];
}

/**
 * Split a week's battles into the ones still to come and the fought ones.
 *
 * "Fought" follows the battle time, not the attendance lock: a locked battle that has not been
 * played yet still belongs to the member's next steps. When every battle is fought nothing is
 * folded, so the screen is not left empty after the week's last battle.
 * @param sessions - Battles of the week
 * @param now - The instant to measure against
 * @returns The two groups, each in the original order
 */
export function splitFoughtBattles<T extends Pick<BattleSession, "dateTime">>(
  sessions: T[],
  now: Date
): FoughtSplit<T> {
  const fought = sessions.filter(
    (session) => new Date(session.dateTime).getTime() <= now.getTime()
  );
  if (fought.length === sessions.length) {
    return { upcoming: sessions, fought: [] };
  }

  return {
    upcoming: sessions.filter((session) => !fought.includes(session)),
    fought,
  };
}
