import { isSameVnDay } from "@guild/shared/lib";
import type { SessionFormation } from "@guild/shared/schemas";

/** The fields needed to pick a tab. */
type SelectableSession = Pick<
  SessionFormation,
  "sessionId" | "isGuildWar" | "dateTime"
>;

/**
 * Pick the battle tab to open. The stored id can point at a battle an admin has
 * since deleted, so it only wins when it is still on screen.
 *
 * Falling back, today's battle comes before the Guild War: on a battle day that
 * is the day the admin came here for. Today is a Vietnam calendar day, matched
 * against the battle's own date — so browsing another week matches nothing and
 * lands on the Guild War, as it did before. A battle already played still
 * counts: 21:00 on Saturday is still Saturday.
 *
 * @param sessions - Battles of the week on screen, ordered by battle time
 * @param storedId - Battle the user last opened, from the store
 * @param now - The current instant, used to find today's battle
 * @returns The battle to open, or null when the week holds no battle
 */
export function resolveActiveSessionId(
  sessions: SelectableSession[],
  storedId: string | null,
  now: Date
): string | null {
  const stored = sessions.find((session) => session.sessionId === storedId);
  if (stored) return stored.sessionId;

  const today = sessions.find((session) =>
    isSameVnDay(new Date(session.dateTime), now)
  );
  if (today) return today.sessionId;

  // Default to the Guild War tab: it is the battle that matters most.
  return (
    sessions.find((session) => session.isGuildWar)?.sessionId ??
    sessions[0]?.sessionId ??
    null
  );
}
