import type { MessagePayload } from './commands/command.types';
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
}

/**
 * Build the direct message that tells one member which team they are in for one match.
 *
 * Pure, like `buildFormationAnnouncement`: everything it says arrives in `input`. The positions are
 * not listed: the card image shows them, and without an image the link to the announcement does.
 * `allowed_mentions` closes every mention because the team name is typed by an admin and must not
 * be able to ping anybody; the channel link is not a pinging mention, so it needs no opening.
 *
 * @param input - The match, the team and whether an image goes with it
 * @returns The message body, ready for `postMessage` or `postMessageWithFiles`
 */
export function buildTeamNotice(input: TeamNoticeInput): MessagePayload {
  const { gather } = timesOf(input);
  const team = input.teamName
    ? `**${input.teamName}** (team ${input.team})`
    : `**Team ${input.team}**`;
  const lines = [
    `**${battleHeading(input)} - Trận ${input.matchIndex}/${input.matchCount}**`,
    `Bạn ở ${team}. Online trước ${gather}.`,
    ...(input.hasImage
      ? []
      : [`Xem đội hình trong <#${input.bangChienChannelId}>.`]),
  ];

  return {
    content: lines.join('\n'),
    allowed_mentions: { parse: [] },
  };
}
