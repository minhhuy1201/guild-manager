import type { MessagePayload } from './commands/command.types';
import { battleHeading, timesOf } from './formation-announcement';

/** One position of the team, already resolved to a name. */
export interface TeamNoticeSlot {
  /** Who stands here, null for an empty position */
  characterId: string | null;
  /** Name of that character, null exactly when `characterId` is */
  name: string | null;
  /** The team builder's note for this position, null when there is none */
  note: string | null;
}

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
  /** The member this notice goes to. Their line is marked. */
  recipientId: string;
  /** Every position of the team, in order */
  slots: TeamNoticeSlot[];
}

/** Shown for a position nobody stands in. */
const EMPTY_SLOT = '(trống)';

/**
 * One position as a list line.
 * @param slot - The position
 * @param index - Zero-based position, shown 1-based
 * @param recipientId - Who the notice goes to
 * @returns e.g. `2. **Kirito** ← bạn - tank`
 */
function slotLine(
  slot: TeamNoticeSlot,
  index: number,
  recipientId: string,
): string {
  const isRecipient = slot.characterId === recipientId;
  const occupant = slot.name ?? EMPTY_SLOT;
  const who = isRecipient ? `**${occupant}** ← bạn` : occupant;
  const note = slot.note ? ` - ${slot.note}` : '';

  return `${index + 1}. ${who}${note}`;
}

/**
 * Build the direct message that tells one member which team they are in for one match.
 *
 * Pure, like `buildFormationAnnouncement`: everything it says arrives in `input`. `allowed_mentions`
 * closes every mention because the team name and the notes are typed by an admin and must not be
 * able to ping anybody.
 *
 * @param input - The match, the team and the recipient
 * @returns The message body, ready for `postMessage`
 */
export function buildTeamNotice(input: TeamNoticeInput): MessagePayload {
  const { gather } = timesOf(input);
  const team = input.teamName
    ? `**${input.teamName}** (team ${input.team})`
    : `**Team ${input.team}**`;

  return {
    content: [
      `**${battleHeading(input)} - Trận ${input.matchIndex}/${input.matchCount}**`,
      `Bạn ở ${team}`,
      `Online trước ${gather}.`,
      '',
      ...input.slots.map((slot, index) =>
        slotLine(slot, index, input.recipientId),
      ),
    ].join('\n'),
    allowed_mentions: { parse: [] },
  };
}
