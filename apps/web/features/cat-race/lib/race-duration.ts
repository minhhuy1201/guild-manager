/** Seconds the winner takes to cross the line; the admin types it, inside these limits. */
export const RACE_DURATION_MIN_SECONDS = 10;
export const RACE_DURATION_MAX_SECONDS = 40;
export const RACE_DURATION_DEFAULT_SECONDS = 12;

/** Shown under the field when the typed value is out of range. */
export const RACE_DURATION_ERROR = `Nhập số giây nguyên từ ${RACE_DURATION_MIN_SECONDS} đến ${RACE_DURATION_MAX_SECONDS}.`;

/**
 * Read a typed duration.
 * @param raw - What the field holds
 * @returns The seconds, or null when it is not a whole number inside the limits
 */
export function parseRaceDuration(raw: string): number | null {
  const text = raw.trim();
  if (!/^\d+$/.test(text)) return null;
  const seconds = Number(text);
  if (seconds < RACE_DURATION_MIN_SECONDS || seconds > RACE_DURATION_MAX_SECONDS) return null;

  return seconds;
}
