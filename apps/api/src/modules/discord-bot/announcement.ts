import { shiftVnDate, vnParts } from '@guild/shared/lib';
import type { BattleSession } from '@guild/shared/schemas';

import type {
  ActionRow,
  CommandLinks,
  EmbedField,
  MessagePayload,
} from './commands/command.types';
import { ANNOUNCEMENT_ATTENDANCE_ID } from './custom-id';
import { BUTTON_STYLE, COMPONENT_TYPE, EMBED_COLOR } from './discord.constants';

const TITLE = '📢 LỊCH ĐÁNH TUẦN NÀY';

/** Replaces the date range when the week holds no battle day at all. */
const NO_SESSIONS = 'Tuần này chưa có ngày đánh nào.';

const HOW_TO_NAME = '✅ Điểm danh';

const HOW_TO_VALUE = [
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
 * One battle day as an embed field.
 *
 * The label is the one the backend already built (`formatSessionLabel`), never rebuilt here — a
 * second labelling convention is exactly what this command was written to avoid.
 *
 * @param session - The battle day
 * @returns An inline field, so Discord lays three of them per row
 */
function toField(session: BattleSession): EmbedField {
  const icon = session.isGuildWar ? '🛡️' : '⚔️';
  const lines = [
    `📅 ${formatDayMonth(new Date(session.dateTime))}`,
    `🎮 ${session.matchCount} trận`,
  ];

  if (session.opponent) lines.push(`🆚 ${session.opponent}`);

  return {
    name: `${icon} ${session.label}`,
    value: lines.join('\n'),
    inline: true,
  };
}

/**
 * The row of buttons under the announcement.
 * @param webOrigin - Origin of the web app
 * @returns One action row holding both buttons
 */
function buildButtons(webOrigin: string): ActionRow {
  return {
    type: COMPONENT_TYPE.actionRow,
    components: [
      {
        type: COMPONENT_TYPE.button,
        style: BUTTON_STYLE.primary,
        label: '✅ Điểm danh ngay',
        custom_id: ANNOUNCEMENT_ATTENDANCE_ID,
      },
      {
        type: COMPONENT_TYPE.button,
        style: BUTTON_STYLE.link,
        label: '🌐 Mở website',
        url: webOrigin,
      },
    ],
  };
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
  const howTo: EmbedField = {
    name: HOW_TO_NAME,
    value: HOW_TO_VALUE,
    inline: false,
  };

  return {
    content: `<@&${links.guildRoleId}>`,
    embeds: [
      {
        title: TITLE,
        description:
          sessions.length > 0
            ? describeWeek(sessions[0].weekStart)
            : NO_SESSIONS,
        color: EMBED_COLOR,
        fields: [...sessions.map(toField), howTo],
        footer: { text: FOOTER },
      },
    ],
    components: [buildButtons(links.webOrigin)],
    allowed_mentions: { roles: [links.guildRoleId] },
  };
}
