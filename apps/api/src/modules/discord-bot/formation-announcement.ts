import { shiftVnDate, vnParts } from '@guild/shared/lib';

import type { MessagePayload } from './commands/command.types';
import { formatVnDayMonth, formatVnTime } from './vn-format';

/** How long before a scrim members are asked to be online. */
const SCRIM_GATHER_MINUTES = 45;

/** How long before a scrim an empty slot is handed to somebody else. */
const SCRIM_REPLACE_MINUTES = 15;

/** Minutes in milliseconds, for shifting a battle time backwards. */
const MINUTE_MS = 60_000;

/**
 * The Guild War's three times, written out rather than derived.
 *
 * The Guild War is pinned to 20:00 Saturday (architecture.md §6) and these are the words the guild
 * already knows. They are not a shifted copy of the scrim rule — 19:30 is 30 minutes before the
 * battle where a scrim asks for 45 — so forcing both into one formula would silently reword the
 * announcement. If the Guild War ever moves, this constant and the spec change together.
 */
const GUILD_WAR_TIMES = {
  gather: '19:30',
  replace: '19:45',
  late: '19:45',
} as const;

/** The rule of dashes the guild's own template puts above the mention. */
const SEPARATOR = '-'.repeat(69);

/** What the announcement says about the battle it announces. */
export interface FormationAnnouncementInput {
  /** Saturday Guild War — decides both the wording and the three times */
  isGuildWar: boolean;
  /** When the battle is played */
  dateTime: Date;
  /** How many matches the day is played over — the schedule, not the number of images */
  matchCount: number;
  /** Now, from `Clock` — decides the "TỐI NAY" / "TỐI MAI" phrase */
  now: Date;
}

/** The two Discord ids the message points at. */
export interface FormationAnnouncementLinks {
  /** Role mentioned so every member is notified */
  guildRoleId: string;
  /** Channel `#🤒│báo-bận`, where somebody who cannot make it says so */
  baoBanChannelId: string;
}

/** The three times one announcement quotes, already formatted as `HH:mm`. */
export interface GatheringTimes {
  /** When everyone on the list should already be online */
  gather: string;
  /** After this, an empty slot goes to somebody else */
  replace: string;
  /** Arriving after this counts as late, and has to be reported */
  late: string;
}

/**
 * The three times of one battle, already formatted.
 *
 * Shared with the Team notice, so a member's DM and the channel message quote the same hour.
 *
 * @param input - The battle being announced
 * @returns Gather time, replacement time and the "arriving late" time
 */
export function timesOf(
  input: Pick<FormationAnnouncementInput, 'isGuildWar' | 'dateTime'>,
): GatheringTimes {
  if (input.isGuildWar) return GUILD_WAR_TIMES;

  const before = (minutes: number) =>
    formatVnTime(new Date(input.dateTime.getTime() - minutes * MINUTE_MS));

  return {
    gather: before(SCRIM_GATHER_MINUTES),
    replace: before(SCRIM_REPLACE_MINUTES),
    late: before(SCRIM_GATHER_MINUTES),
  };
}

/**
 * The battle's kind, time and date as the headline of a message, e.g. `SCRIM 20:30 19/08`.
 * @param input - The battle
 * @returns The headline without any markdown
 */
export function battleHeading(
  input: Pick<FormationAnnouncementInput, 'isGuildWar' | 'dateTime'>,
): string {
  const kind = input.isGuildWar ? 'BANG CHIẾN' : 'SCRIM';

  return `${kind} ${formatVnTime(input.dateTime)} ${formatVnDayMonth(input.dateTime)}`;
}

/**
 * A calendar day in Vietnam time, as a comparable key.
 * @param date - The instant
 * @returns A `YYYY-M-D` key
 */
function vnDayKey(date: Date): string {
  const { year, month, day } = vnParts(date);

  return `${year}-${month}-${day}`;
}

/**
 * The phrase saying how soon the battle is, appended to the date.
 *
 * Empty for anything past tomorrow: "TỐI NAY" on a message posted three days early is a lie, and
 * the date right before it already says when.
 *
 * @param dateTime - When the battle is played
 * @param now - Now
 * @returns " TỐI NAY", " TỐI MAI", or an empty string
 */
function dayPhrase(dateTime: Date, now: Date): string {
  const battleDay = vnDayKey(dateTime);

  if (battleDay === vnDayKey(now)) return ' TỐI NAY';
  if (battleDay === vnDayKey(shiftVnDate(now, 1, 0, 0))) return ' TỐI MAI';

  return '';
}

/**
 * Build the formation announcement posted with the line-up images.
 *
 * Pure: everything it says arrives in `input`, so the whole wording is testable without a database
 * or a clock. The mention lives in `content` because Discord only notifies people for mentions in
 * the message text, and `allowed_mentions` is present to *close* everything else — the message is
 * assembled from admin-entered data and must not be able to grow an `@everyone`.
 *
 * @param input - The battle being announced
 * @param links - The role to ping and the channel to link
 * @returns The message body, ready for `postMessageWithFiles`
 */
export function buildFormationAnnouncement(
  input: FormationAnnouncementInput,
  links: FormationAnnouncementLinks,
): MessagePayload {
  const times = timesOf(input);
  return {
    content: [
      `# ${battleHeading(input)}${dayPhrase(input.dateTime, input.now)} - ${input.matchCount} TRẬN`,
      `## - Các thành viên có tên trong danh sách vui lòng online *sớm trước ${times.gather}* !`,
      `## - Sau ${times.replace} chưa online, slot được thay thế cho thành viên khác.`,
      `## - Nếu không thể tham gia hoặc vào trễ *sau ${times.late}*, báo gấp vào <#${links.baoBanChannelId}> .`,
      '## - Những ai không có tên trong danh sách *vẫn nên online để sẵn sàng thay thế khi cần thiết*.',
      SEPARATOR,
      `<@&${links.guildRoleId}>`,
    ].join('\n'),
    allowed_mentions: { roles: [links.guildRoleId] },
  };
}
