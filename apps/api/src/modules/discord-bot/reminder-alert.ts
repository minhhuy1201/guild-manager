import { MAX_CONTENT_LENGTH } from './discord.constants';
import { takeWithinLimit } from './message-limits';

/** The three groups of people a reminder run could not reach, each by character name. */
export interface UndeliveredGroups {
  /** No Discord ID filled in, so there was nobody to message */
  unlinked: string[];
  /** Blocks DMs from the bot */
  blocked: string[];
  /** Not sent for any other reason: a rate limit, the time budget, a Discord error */
  unsent: string[];
}

/** Heading and label of each group, in the order they are listed. */
const GROUP_LABELS: readonly { key: keyof UndeliveredGroups; label: string }[] =
  [
    { key: 'unlinked', label: 'Chưa liên kết Discord ID' },
    { key: 'blocked', label: 'Chặn DM từ bot' },
    { key: 'unsent', label: 'Chưa gửi được (chạy /nhac-diem-danh để nhắc bù)' },
  ];

/** Characters kept free for the lead line and the labels, so the names share what is left. */
const RESERVED_LENGTH = 300;

/**
 * Whether the run reached everyone it meant to.
 * @param groups - Who the run could not reach
 * @returns true when at least one person did not get their reminder
 */
export function hasUndelivered(groups: UndeliveredGroups): boolean {
  return GROUP_LABELS.some(({ key }) => groups[key].length > 0);
}

/**
 * The lines naming who did not get a reminder, one per non-empty group.
 *
 * Each group's names are trimmed to an equal share of one Discord message, so a crowded group
 * cannot push the others out and the whole text is always postable.
 *
 * @param groups - Who the run could not reach
 * @returns One line per group that has anyone in it
 */
export function undeliveredLines(groups: UndeliveredGroups): string[] {
  const present = GROUP_LABELS.filter(({ key }) => groups[key].length > 0);
  const share = Math.floor((MAX_CONTENT_LENGTH - RESERVED_LENGTH) / 3);

  return present.map(({ key, label }) => {
    const names = takeWithinLimit(groups[key], {
      separator: ', ',
      limit: share,
      more: (count) => `và ${count} người nữa`,
    }).text;

    return `- ${label}: ${names}`;
  });
}

/**
 * The admin alert for a scheduled reminder that left some people unreached.
 * @param groups - Who the run could not reach
 * @returns The message to post in the admin channel
 */
export function reminderUndeliveredText(groups: UndeliveredGroups): string {
  return [
    '⚠️ Nhắc điểm danh 9h: có người không nhận được tin nhắc.',
    ...undeliveredLines(groups),
  ].join('\n');
}

/**
 * The admin alert for a scheduled reminder that threw.
 * Never quotes the error itself - it may carry database detail; the log has it.
 * @returns The sentence to post in the admin channel
 */
export function reminderFailureText(): string {
  return '⚠️ Nhắc điểm danh 9h thất bại (lỗi hệ thống). Xem log Vercel, rồi chạy /nhac-diem-danh để nhắc bù.';
}
