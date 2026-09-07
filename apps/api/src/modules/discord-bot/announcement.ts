import { shiftVnDate } from '@guild/shared/lib';
import type { BattleSession } from '@guild/shared/schemas';

import type { CommandLinks, MessagePayload } from './commands/command.types';
import { EMBED_COLOR, MAX_EMBED_DESCRIPTION_LENGTH } from './discord.constants';
import { buildEntryButtons } from './entry-buttons';
import { takeWithinLimit } from './message-limits';
import { formatVnDayMonth } from './vn-format';

const TITLE = '📢 LỊCH ĐÁNH TUẦN NÀY';

/** Replaces the date range when the week holds no battle day at all. */
const NO_SESSIONS = 'Tuần này chưa có ngày đánh nào.';

const HOW_TO = [
  '### ✅ Điểm danh',
  'Bấm **Điểm danh ngay** bên dưới, hoặc gõ `/diem-danh` trong chat.',
  'Bận thì chọn **KHÔNG**.',
  'Gặp lỗi đăng nhập thì báo admin.',
].join('\n');

const FOOTER = 'Guild Manager';

/** An attendance week runs Monday 00:00 → Saturday 23:59 (architecture.md §6). */
const DAYS_TO_WEEK_END = 5;

/** Blank line between blocks: Discord collapses a heading against the line above it. */
const BLOCK_SEPARATOR = '\n\n';

/**
 * The week's date range, for the line under the title.
 * @param weekStart - Monday 00:00 of the week, as the API returns it
 * @returns A range like "31/08 – 05/09"
 */
function describeWeek(weekStart: string): string {
  const start = new Date(weekStart);
  const end = shiftVnDate(start, DAYS_TO_WEEK_END, 0, 0);

  return `${formatVnDayMonth(start)} – ${formatVnDayMonth(end)}`;
}

/**
 * One battle day as a two-line block.
 *
 * The day's name is a `###` heading: Discord renders it visibly larger than body text, which is the
 * only size control an embed offers, and a heading always starts its own line — so the days stack
 * down the message instead of sharing a row.
 *
 * The label itself is the one the backend already built (`formatSessionLabel`), never rebuilt here —
 * a second labelling convention is exactly what this command was written to avoid.
 *
 * @param session - The battle day
 * @returns Heading line plus a single detail line
 */
function toBlock(session: BattleSession): string {
  const icon = session.isGuildWar ? '🛡️' : '⚔️';
  const details = [
    `📅 ${formatVnDayMonth(new Date(session.dateTime))}`,
    `🎮 ${session.matchCount} trận`,
  ];

  if (session.opponent) details.push(`🆚 ${session.opponent}`);

  return `### ${icon} ${session.label}\n${details.join(' · ')}`;
}

/**
 * Build the weekly schedule announcement.
 *
 * Pure: everything it shows arrives in `sessions`, so the whole layout is testable without a
 * database. The role mention lives in `content` rather than inside the embed, because Discord only
 * notifies people for mentions in the message text.
 *
 * @param sessions - Battle days of the open week, in the order they are played
 * @param links - Web origin and the guild role to mention
 * @returns The message body, ready to be wrapped by `publicMessage`
 */
export function buildAnnouncement(
  sessions: readonly BattleSession[],
  links: Pick<CommandLinks, 'webOrigin' | 'guildRoleId'>,
): MessagePayload {
  const heading =
    sessions.length > 0
      ? `**${describeWeek(sessions[0].weekStart)}**`
      : NO_SESSIONS;

  // The heading and the instructions are kept whole and the day list absorbs any trimming: an
  // announcement that has lost "how to answer" is a list nobody can act on, and Discord refuses the
  // whole message past 4096 characters rather than truncating it for us.
  const days = takeWithinLimit(sessions.map(toBlock), {
    separator: BLOCK_SEPARATOR,
    limit:
      MAX_EMBED_DESCRIPTION_LENGTH -
      heading.length -
      HOW_TO.length -
      2 * BLOCK_SEPARATOR.length,
    more: (count) => `… và ${count} ngày đánh nữa, xem trên web.`,
  }).text;

  return {
    content: `<@&${links.guildRoleId}>`,
    embeds: [
      {
        title: TITLE,
        description: [heading, days, HOW_TO]
          .filter((part) => part.length > 0)
          .join(BLOCK_SEPARATOR),
        color: EMBED_COLOR,
        footer: { text: FOOTER },
      },
    ],
    components: [buildEntryButtons(links.webOrigin)],
    allowed_mentions: { roles: [links.guildRoleId] },
  };
}
