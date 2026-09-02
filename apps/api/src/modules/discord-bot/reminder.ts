import type { BattleSession } from '@guild/shared/schemas';

import { formatDeadlineLabel } from '../battle-sessions/battle-sessions.public';
import type { MessagePayload } from './commands/command.types';
import { EMBED_COLOR } from './discord.constants';
import { buildEntryButtons } from './entry-buttons';

const TITLE = '⏰ CHƯA ĐIỂM DANH';

const LEAD = '⏰ **Nhắc điểm danh** — mấy ngày dưới đây hết hạn vào ngày mai.';

const FOOTER = 'Guild Manager';

/** One member who has not answered for a battle day. */
export interface MissingMember {
  name: string;
  /** null when no admin has filled in their Discord ID yet — they cannot be mentioned. */
  discordId: string | null;
}

/** One battle day whose deadline falls tomorrow, with everyone still missing from it. */
export interface DueSession {
  session: BattleSession;
  missing: MissingMember[];
}

/**
 * One battle day as a block of the embed.
 *
 * The day's name is a `###` heading: Discord renders it visibly larger than body text, which is the
 * only size control an embed offers, and a heading always starts its own line. The label itself is
 * the one the backend already built (`formatSessionLabel`), never rebuilt here.
 *
 * Names, not mentions: a mention inside an embed notifies nobody, so spending its characters here
 * would only make the message longer. The pings live in `content`.
 *
 * @param due - The battle day and who is missing from it
 * @returns Heading, a detail line, the names, and the unlinked line when there is one
 */
function toBlock(due: DueSession): string {
  const icon = due.session.isGuildWar ? '🛡️' : '⚔️';
  const deadline = formatDeadlineLabel(new Date(due.session.deadline));

  const linked = due.missing.filter((member) => member.discordId !== null);
  const unlinked = due.missing.filter((member) => member.discordId === null);

  const lines = [
    `### ${icon} ${due.session.label}`,
    `⏳ Hạn: ${deadline} · 👥 còn ${due.missing.length} người`,
    linked.map((member) => member.name).join(', '),
  ];

  // Named rather than dropped: nobody can ping them, so an admin has to — and has to know they
  // exist before they can.
  if (unlinked.length > 0) {
    lines.push(
      `Chưa liên kết Discord: ${unlinked.map((member) => member.name).join(', ')}`,
    );
  }

  return lines.filter((line) => line.length > 0).join('\n');
}

/**
 * Every Discord ID to ping, each exactly once.
 *
 * The union rather than a list per battle day: somebody missing three days would otherwise be
 * mentioned three times, and three days' worth of mentions is where a 2000-character message body
 * runs out.
 *
 * @param due - The due battle days
 * @returns Discord IDs, in the order they were first met
 */
function mentionedIds(due: readonly DueSession[]): string[] {
  const ids = due.flatMap((day) =>
    day.missing
      .map((member) => member.discordId)
      .filter((id): id is string => id !== null),
  );

  return [...new Set(ids)];
}

/**
 * Build the attendance reminder.
 *
 * Pure: everything it shows arrives in `due`, so the whole layout is testable without a database.
 * The mentions live in `content` rather than inside the embed, because Discord only notifies people
 * for mentions in the message text.
 *
 * @param due - Battle days whose deadline falls tomorrow, each with everyone still missing. Never
 *   empty, and never carrying an empty `missing`: `ReminderService` drops those first, so a message
 *   that says nothing is never built
 * @param webOrigin - Origin of the web app, for the link button
 * @returns The message body, ready for `DiscordRestClient.postMessage`
 */
export function buildReminder(
  due: readonly DueSession[],
  webOrigin: string,
): MessagePayload {
  const ids = mentionedIds(due);

  return {
    content: `${LEAD}\n${ids.map((id) => `<@${id}>`).join(' ')}`,
    embeds: [
      {
        title: TITLE,
        // A blank line between blocks: Discord collapses a heading against the line above it.
        description: due.map(toBlock).join('\n\n'),
        color: EMBED_COLOR,
        footer: { text: FOOTER },
      },
    ],
    components: [buildEntryButtons(webOrigin)],
    allowed_mentions: { users: ids },
  };
}
