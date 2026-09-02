/** The session fields needed to build the subtitle. */
interface SessionSubtitleInput {
  /** A Guild War session — no opponent */
  isGuildWar: boolean;
  /** Battle time (ISO string) */
  dateTime: string;
  /** Opponent guild name, null when undecided */
  opponent: string | null;
}

/**
 * The subtitle rendered under a battle day's label.
 *
 * A scrim shows the opponent guild, and says so plainly when there is none yet so admins know
 * information is still missing. A Guild War has nothing left to add — its label already carries the
 * battle time — so it returns an empty string and callers drop the line entirely.
 *
 * @param session - Session to display
 * @returns The built subtitle, empty when there is nothing to say
 */
export function getSessionSubtitle(session: SessionSubtitleInput): string {
  if (session.isGuildWar) return "";

  return session.opponent ? `VS: ${session.opponent}` : "Chưa có đối thủ";
}

/**
 * Join the pieces of one meta line, dropping the empty ones.
 *
 * A Guild War has no subtitle, so a caller that appends its own piece — a count, a progress
 * marker — must not be left with a leading separator.
 *
 * @param parts - Pieces in display order; empty, null and undefined are skipped
 * @returns The joined line, empty when nothing survived
 */
export function joinSessionMeta(
  ...parts: (string | null | undefined)[]
): string {
  return parts.filter(Boolean).join(" · ");
}
