import { noteQuoteLines } from './announcement-note';
import { battleHeading, timesOf } from './formation-announcement';

/** What one Team notice says. */
export interface TeamNoticeInput {
  /** Saturday Guild War: sets the headline and the online time */
  isGuildWar: boolean;
  /** When the battle is played */
  dateTime: Date;
  /** Which match this notice is about, 1-based like the stored `FormationMatch.matchIndex` */
  matchIndex: number;
  /** How many matches the day is played over */
  matchCount: number;
  /** Team number, 1..TEAM_COUNT */
  team: number;
  /** The team's name, null while it still shows its number */
  teamName: string | null;
  /** Whether the team's card image travels with this message */
  hasImage: boolean;
  /** The guild war channel, where the line-up announcement lives */
  bangChienChannelId: string;
  /** The Announcement note, already trimmed; null when the admin wrote none */
  note: string | null;
}

/**
 * The text of the direct message that tells one member which team they are in for one match.
 *
 * Pure, like `formationAnnouncementContent`: everything it says arrives in `input`. The positions
 * are not listed: the card image shows them, and without an image the link to the announcement does.
 *
 * @param input - The match, the team and whether an image goes with it
 * @returns The message text
 */
export function teamNoticeContent(input: TeamNoticeInput): string {
  const { gather } = timesOf(input);
  const team = input.teamName
    ? `**${input.teamName}** (team ${input.team})`
    : `**Team ${input.team}**`;

  return [
    `**${battleHeading(input)} - Trận ${input.matchIndex}/${input.matchCount}**`,
    ...noteQuoteLines(input.note),
    `Bạn ở ${team}. Online trước ${gather}.`,
    ...(input.hasImage
      ? []
      : [`Xem đội hình trong <#${input.bangChienChannelId}>.`]),
  ].join('\n');
}
