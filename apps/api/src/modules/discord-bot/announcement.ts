import { shiftVnDate, vnParts } from '@guild/shared/lib';
import type { BattleSession } from '@guild/shared/schemas';

import type { CommandLinks, MessagePayload } from './commands/command.types';
import { EMBED_COLOR } from './discord.constants';
import { buildEntryButtons } from './entry-buttons';

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

/**
 * Day and month of an instant, read in Vietnam time.
 * @param date - The instant
 * @returns A `dd/MM` string
 */
function formatDayMonth(date: Date): string {
  const { day, month } = vnParts(date);

  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
}

/**
 * The week's date range, for the line under the title.
 * @param weekStart - Monday 00:00 of the week, as the API returns it
 * @returns A range like "31/08 – 05/09"
 */
function describeWeek(weekStart: string): string {
  const start = new Date(weekStart);
  const end = shiftVnDate(start, DAYS_TO_WEEK_END, 0, 0);

  return `${formatDayMonth(start)} – ${formatDayMonth(end)}`;
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
    `📅 ${formatDayMonth(new Date(session.dateTime))}`,
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
  links: CommandLinks,
): MessagePayload {
  const heading =
    sessions.length > 0
      ? `**${describeWeek(sessions[0].weekStart)}**`
      : NO_SESSIONS;

  return {
    content: `<@&${links.guildRoleId}>`,
    embeds: [
      {
        title: TITLE,
        // A blank line between blocks: Discord collapses a heading against the line above it.
        description: [heading, ...sessions.map(toBlock), HOW_TO].join('\n\n'),
        color: EMBED_COLOR,
        footer: { text: FOOTER },
      },
    ],
    components: [buildEntryButtons(links.webOrigin)],
    allowed_mentions: { roles: [links.guildRoleId] },
  };
}
