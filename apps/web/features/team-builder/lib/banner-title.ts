import { sessionKindLabel } from "@/components/shared/session-label";
import { getSessionSubtitle } from "@/features/attendance";
import { formatDayMonth, formatTime } from "@/lib/format";

/** The session fields the banner title is built from. */
interface BannerTitleInput {
  /** A Guild War session — the banner says "BANG CHIẾN" instead of "SCRIM" */
  isGuildWar: boolean;
  /** Battle time (ISO string) */
  dateTime: string;
  /** Opponent guild name, null when undecided */
  opponent: string | null;
  /** Zero-based index of the match currently open */
  activeMatchIndex: number;
  /** How many matches actually hold a line-up on screen */
  draftMatchCount: number;
  /** How many matches the day is scheduled over */
  scheduledMatchCount: number;
}

/**
 * The trailing piece naming which match the grid belongs to.
 *
 * A single line-up covers the whole day — one match, or two played with the same teams — so
 * there is no match to point at and the banner announces the day's match count instead.
 * Numbering it "trận 1/1" would contradict a schedule of two.
 *
 * A second line-up means the two matches differ, and only then does saying which one is on
 * screen carry information.
 *
 * @param activeMatchIndex - Zero-based index of the match currently open
 * @param draftMatchCount - How many matches hold a line-up on screen
 * @param scheduledMatchCount - How many matches the day is scheduled over
 * @returns The match piece of the headline
 */
function matchPart(
  activeMatchIndex: number,
  draftMatchCount: number,
  scheduledMatchCount: number
): string {
  if (draftMatchCount <= 1) return `${scheduledMatchCount} trận`;

  return `trận ${activeMatchIndex + 1}/${draftMatchCount}`;
}

/**
 * The headline shown above the formation grid, e.g.
 * "SCRIM 20:30 03/09 - VS: Bang ABC - trận 1/2", or "… - 2 trận" while one line-up covers
 * the whole day.
 *
 * Carries the opponent because it is the one thing about the battle that the grid below
 * shows nowhere else. The match number is one-based because it is read by people, while
 * the index the screen carries is zero-based.
 *
 * @param session - The battle on screen and which of its matches is open
 * @returns The banner headline
 */
export function buildBannerTitle({
  isGuildWar,
  dateTime,
  opponent,
  activeMatchIndex,
  draftMatchCount,
  scheduledMatchCount,
}: BannerTitleInput): string {
  const head = `${sessionKindLabel(isGuildWar)} ${formatTime(dateTime)} ${formatDayMonth(dateTime)}`;
  const parts = [
    head,
    getSessionSubtitle({ isGuildWar, dateTime, opponent }),
    matchPart(activeMatchIndex, draftMatchCount, scheduledMatchCount),
  ];

  return parts.filter(Boolean).join(" - ");
}
