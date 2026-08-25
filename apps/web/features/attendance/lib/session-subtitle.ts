import { formatTime } from "@/lib/format";

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
 * A Guild War shows only the battle time; a scrim shows the opponent guild, and says so plainly when
 * there is none yet so admins know information is still missing.
 * @param session - Session to display
 * @returns The built subtitle
 */
export function getSessionSubtitle(session: SessionSubtitleInput): string {
  if (session.isGuildWar) return formatTime(session.dateTime);

  return session.opponent ? `VS: ${session.opponent}` : "Chưa có đối thủ";
}
