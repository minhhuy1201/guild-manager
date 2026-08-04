import type { SessionFormation } from "../types/session-formation";

/** The fields needed to pick a tab. */
type SelectableSession = Pick<SessionFormation, "sessionId" | "isGuildWar">;

/**
 * Pick the battle tab to open. The stored id can point at a battle an admin has
 * since deleted, so it only wins when it is still on screen.
 * @param sessions - Battles of the week on screen
 * @param storedId - Battle the user last opened, from the store
 * @returns The battle to open, or null when the week holds no battle
 */
export function resolveActiveSessionId(
  sessions: SelectableSession[],
  storedId: string | null
): string | null {
  const stored = sessions.find((session) => session.sessionId === storedId);
  if (stored) return stored.sessionId;

  // Default to the Guild War tab: it is the battle that matters most.
  return (
    sessions.find((session) => session.isGuildWar)?.sessionId ??
    sessions[0]?.sessionId ??
    null
  );
}
