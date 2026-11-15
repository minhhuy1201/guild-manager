import type { BattleSession } from '@guild/shared/schemas';

import { formatDeadlineLabel } from '../battle-sessions/battle-sessions.public';
import type { MessagePayload } from './commands/command.types';
import { EMBED_COLOR, MAX_EMBED_DESCRIPTION_LENGTH } from './discord.constants';
import { buildEntryButtons } from './entry-buttons';
import { takeWithinLimit } from './message-limits';

const TITLE = '⏰ Nhắc điểm danh';

const FOOTER = 'Guild Manager';

/** Blank line between day blocks: Discord collapses a heading against the line above it. */
const BLOCK_SEPARATOR = '\n\n';

/**
 * One battle day as a block of the embed.
 *
 * The day's name is a `###` heading: Discord renders it visibly larger than body text, which is the
 * only size control an embed offers, and a heading always starts its own line. The label itself is
 * the one the backend already built (`formatSessionLabel`), never rebuilt here.
 *
 * @param session - The battle day the member has not answered for
 * @returns Heading and the deadline line
 */
function toBlock(session: BattleSession): string {
  const icon = session.isGuildWar ? '🛡️' : '⚔️';
  const deadline = formatDeadlineLabel(new Date(session.deadline));

  return `### ${icon} ${session.label}\n⏳ Hạn: ${deadline}`;
}

/**
 * Build one member's Attendance reminder, the direct message listing every day they still owe an
 * answer for.
 *
 * Pure: everything it shows arrives in the arguments. Nobody is mentioned and `allowed_mentions`
 * closes every kind, because a DM already reaches only its recipient.
 *
 * @param sessions - The battle days this member has not answered for. Never empty:
 *   `ReminderService` only builds a message for someone who is missing at least one day
 * @param webOrigin - Origin of the web app, for the link button
 * @returns The message body, ready for `DmSenderService`
 */
export function buildReminder(
  sessions: readonly BattleSession[],
  webOrigin: string,
): MessagePayload {
  // Trimmed to what Discord accepts, rather than sent and refused: a 400 here would leave this
  // member unreminded, and a week holds few enough days that the trim is only a guard.
  const description = takeWithinLimit(sessions.map(toBlock), {
    separator: BLOCK_SEPARATOR,
    limit: MAX_EMBED_DESCRIPTION_LENGTH,
    more: (count) => `… và ${count} ngày đánh nữa, xem trên web.`,
  }).text;

  return {
    content: '',
    embeds: [
      {
        title: TITLE,
        description,
        color: EMBED_COLOR,
        footer: { text: FOOTER },
      },
    ],
    components: [buildEntryButtons(webOrigin)],
    allowed_mentions: { parse: [] },
  };
}
