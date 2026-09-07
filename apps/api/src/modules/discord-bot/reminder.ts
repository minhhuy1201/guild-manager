import type { BattleSession } from '@guild/shared/schemas';

import { formatDeadlineLabel } from '../battle-sessions/battle-sessions.public';
import type { MessagePayload } from './commands/command.types';
import {
  EMBED_COLOR,
  MAX_CONTENT_LENGTH,
  MAX_EMBED_DESCRIPTION_LENGTH,
} from './discord.constants';
import { buildEntryButtons } from './entry-buttons';
import { takeWithinLimit } from './message-limits';

const TITLE = '⏰ CHƯA ĐIỂM DANH';

const LEAD = '⏰ **Nhắc điểm danh** — mấy ngày dưới đây hết hạn vào ngày mai.';

const FOOTER = 'Guild Manager';

/** Separator between mentions in `content`. */
const MENTION_SEPARATOR = ' ';

/** Blank line between day blocks: Discord collapses a heading against the line above it. */
const BLOCK_SEPARATOR = '\n\n';

/**
 * Characters reserved in each day's block for everything that is not a name: the heading, the
 * deadline line, and the "Chưa liên kết Discord:" prefix. Generous on purpose - the outer trim is
 * what guarantees the message is valid, this only decides how the budget is shared out.
 */
const BLOCK_RESERVE = 200;

/**
 * How many characters one day's block may spend on each of its two name lists.
 *
 * Split evenly across the due days so three crowded days still produce three readable blocks
 * instead of one long one and two counts.
 *
 * @param dayCount - How many battle days the message covers
 * @returns The character budget for one name list
 */
function nameBudget(dayCount: number): number {
  const perDay = Math.floor(MAX_EMBED_DESCRIPTION_LENGTH / dayCount);

  // Two lists per day: the people who can be mentioned, and the people who cannot.
  return Math.max(0, Math.floor((perDay - BLOCK_RESERVE) / 2));
}

/**
 * Join names, naming the count of anyone who did not fit.
 * @param names - Member names
 * @param limit - Characters available
 * @returns The joined names, within budget
 */
function joinNames(names: string[], limit: number): string {
  return takeWithinLimit(names, {
    separator: ', ',
    limit,
    more: (count) => `và ${count} người nữa`,
  }).text;
}

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
 * Both name lists are trimmed: a guild of a few hundred would otherwise put one day's block past
 * the 4096 characters an embed description is allowed, and Discord answers 400 for the whole message.
 *
 * @param due - The battle day and who is missing from it
 * @param limit - Characters this block may spend on each of its name lists
 * @returns Heading, a detail line, the names, and the unlinked line when there is one
 */
function toBlock(due: DueSession, limit: number): string {
  const icon = due.session.isGuildWar ? '🛡️' : '⚔️';
  const deadline = formatDeadlineLabel(new Date(due.session.deadline));

  const linked = due.missing.filter((member) => member.discordId !== null);
  const unlinked = due.missing.filter((member) => member.discordId === null);

  const lines = [
    `### ${icon} ${due.session.label}`,
    `⏳ Hạn: ${deadline} · 👥 còn ${due.missing.length} người`,
    joinNames(
      linked.map((member) => member.name),
      limit,
    ),
  ];

  // Named rather than dropped: nobody can ping them, so an admin has to — and has to know they
  // exist before they can.
  if (unlinked.length > 0) {
    lines.push(
      `Chưa liên kết Discord: ${joinNames(
        unlinked.map((member) => member.name),
        limit,
      )}`,
    );
  }

  return lines.filter((line) => line.length > 0).join('\n');
}

/**
 * Every Discord ID to ping, each exactly once.
 *
 * The union rather than a list per battle day: somebody missing three days would otherwise be
 * mentioned three times, and three days' worth of mentions is where a 2000-character message body
 * runs out. The union alone is not enough at guild scale, which is why `buildReminder` also trims
 * the list it produces.
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

  // Trimmed to what Discord accepts, rather than sent and refused: a 400 here means no reminder went
  // out at all that morning, inside a cron job nobody is watching.
  const mentions = takeWithinLimit(
    ids.map((id) => `<@${id}>`),
    {
      separator: MENTION_SEPARATOR,
      // The lead line and the newline joining it to the mentions.
      limit: MAX_CONTENT_LENGTH - LEAD.length - 1,
      more: (count) => `và ${count} người nữa`,
    },
  );
  // `kept` is a prefix, so the same slice of `ids` is exactly who ended up in the text. Permitting a
  // ping for someone the message never mentions would be noise in the payload and nothing more.
  const mentionedUsers = ids.slice(0, mentions.kept.length);

  const description = takeWithinLimit(
    due.map((day) => toBlock(day, nameBudget(due.length))),
    {
      separator: BLOCK_SEPARATOR,
      limit: MAX_EMBED_DESCRIPTION_LENGTH,
      more: (count) => `… và ${count} ngày đánh nữa, xem trên web.`,
    },
  ).text;

  return {
    content: `${LEAD}\n${mentions.text}`,
    embeds: [
      {
        title: TITLE,
        description,
        color: EMBED_COLOR,
        footer: { text: FOOTER },
      },
    ],
    components: [buildEntryButtons(webOrigin)],
    allowed_mentions: { users: mentionedUsers },
  };
}
