import { noteQuoteLines } from './announcement-note';
import { formatVnDayMonth, formatVnTime } from './vn-format';
import { shiftVnDate, vnParts } from './vn-time';

/** How long before a battle members are asked to be online. */
const GATHER_MINUTES = 30;

/** How long before a battle an empty slot is handed to somebody else: 15 minutes after gathering. */
const REPLACE_MINUTES = 15;

/** Minutes in milliseconds, for shifting a battle time backwards. */
const MINUTE_MS = 60_000;

/** The rule of dashes the guild's own template puts above the mention. */
const SEPARATOR = '-'.repeat(69);

/** What the announcement says about the battle it announces. */
export interface FormationAnnouncementInput {
  /** Saturday Guild War: decides the wording of the headline */
  isGuildWar: boolean;
  /** When the battle is played */
  dateTime: Date;
  /** How many matches the day is played over — the schedule, not the number of images */
  matchCount: number;
  /** Now, from `Clock` — decides the "TỐI NAY" / "TỐI MAI" phrase */
  now: Date;
  /** The Announcement note, already trimmed; null when the admin wrote none */
  note: string | null;
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
  input: Pick<FormationAnnouncementInput, 'dateTime'>,
): GatheringTimes {
  const before = (minutes: number) =>
    formatVnTime(new Date(input.dateTime.getTime() - minutes * MINUTE_MS));

  return {
    gather: before(GATHER_MINUTES),
    replace: before(REPLACE_MINUTES),
    late: before(REPLACE_MINUTES),
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
 * The text of the formation announcement posted with the line-up images.
 *
 * Pure: everything it says arrives in `input`, so the whole wording is testable without a database
 * or a clock, and the web app can render the same text as a preview. It returns the text only; what
 * the message may ping is the sender's decision, made where the Discord payload is built.
 *
 * @param input - The battle being announced
 * @param links - The role to ping and the channel to link
 * @returns The message text
 */
export function formationAnnouncementContent(
  input: FormationAnnouncementInput,
  links: FormationAnnouncementLinks,
): string {
  const times = timesOf(input);

  return [
    `# ${battleHeading(input)}${dayPhrase(input.dateTime, input.now)} - ${input.matchCount} TRẬN`,
    ...noteQuoteLines(input.note),
    `## - Các thành viên có tên trong danh sách vui lòng online *sớm trước ${times.gather}* !`,
    `## - Sau ${times.replace} chưa online, slot được thay thế cho thành viên khác.`,
    `## - Nếu không thể tham gia hoặc vào trễ *sau ${times.late}*, báo gấp vào <#${links.baoBanChannelId}> .`,
    '## - Những ai không có tên trong danh sách *vẫn nên online để sẵn sàng thay thế khi cần thiết*.',
    SEPARATOR,
    `<@&${links.guildRoleId}>`,
  ].join('\n');
}
