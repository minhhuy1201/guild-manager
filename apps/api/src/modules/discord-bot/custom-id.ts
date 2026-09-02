import { MAX_CUSTOM_ID_LENGTH } from './discord.constants';

/** Marks a custom_id as belonging to the attendance board, so other components can share the route. */
const PREFIX = 'dd';

/** Safe because ids are cuids, `gw-<date>` markers, or name slugs — none of them contain a colon. */
const SEPARATOR = ':';

/** How many parts a well-formed attendance custom_id has, prefix included. */
const PART_COUNT = 4;

/**
 * custom_id of the "Điểm danh ngay" button, on both the `/thong-bao` announcement and the daily
 * attendance reminder.
 *
 * A fixed string rather than an encoded value: the button always means "open the presser's own
 * board", and who is pressing arrives inside the signed interaction — so the same id works on any
 * message the bot sends. Two parts behind an `ann` prefix, so `decodeAttendanceButtonId` — which
 * wants four parts behind `dd` — can never take it for an attendance button.
 */
export const ANNOUNCEMENT_ATTENDANCE_ID = 'ann:diem-danh';

/** What one attendance button carries, since Discord keeps no state between presses. */
export interface AttendanceButtonId {
  sessionId: string;
  characterId: string;
  isPresent: boolean;
}

/**
 * Build the custom_id for one attendance button.
 *
 * The value is client data on the way back — `decodeAttendanceButtonId` returns it, and the write
 * path still re-checks who may mark whom. It is a convenience, never a proof.
 *
 * @param value - Session, character and the answer the button records
 * @returns The custom_id string
 * @throws Error when the result exceeds Discord's 100-character limit — Discord rejects the entire
 *   message in that case, so it must surface here rather than as a failed reply
 */
export function encodeAttendanceButtonId(value: AttendanceButtonId): string {
  const customId = [
    PREFIX,
    value.sessionId,
    value.characterId,
    value.isPresent ? '1' : '0',
  ].join(SEPARATOR);

  if (customId.length > MAX_CUSTOM_ID_LENGTH) {
    throw new Error(
      `custom_id dài ${customId.length} ký tự, vượt giới hạn ${MAX_CUSTOM_ID_LENGTH} của Discord: ${customId}`,
    );
  }

  return customId;
}

/**
 * Read an attendance button's custom_id back.
 * @param customId - Raw custom_id from the interaction
 * @returns The three parts, or null when this component is not an attendance button
 */
export function decodeAttendanceButtonId(
  customId: string,
): AttendanceButtonId | null {
  const parts = customId.split(SEPARATOR);

  if (parts.length !== PART_COUNT) return null;

  const [prefix, sessionId, characterId, answer] = parts;

  if (prefix !== PREFIX) return null;
  if (answer !== '1' && answer !== '0') return null;

  return { sessionId, characterId, isPresent: answer === '1' };
}
