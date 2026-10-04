import { vnDateKey } from '@guild/shared/lib';

const DATE_PATTERN = /^(\d{1,2})\/(\d{1,2})(\/(\d{4}))?$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * How far past its start an end date typed without a year may land. Beyond it the input is read as
 * a typo (`12/10 - 05/10`) rather than a leave running to next year.
 */
const MAX_UNYEARED_SPAN_DAYS = 183;

/**
 * `YYYY-MM-DD` for a real calendar day.
 * @param year - Four-digit year
 * @param month - 1-12
 * @param day - 1-31
 * @returns The day, or null when it does not exist (`31/02` must not roll into March)
 */
function toDateKey(year: number, month: number, day: number): string | null {
  const instant = new Date(Date.UTC(year, month - 1, day));
  const isReal =
    instant.getUTCFullYear() === year &&
    instant.getUTCMonth() === month - 1 &&
    instant.getUTCDate() === day;

  return isReal ? instant.toISOString().slice(0, 10) : null;
}

/**
 * The first real occurrence of a day-month on or after a date.
 * @param month - 1-12
 * @param day - 1-31
 * @param notBefore - `YYYY-MM-DD`
 * @returns The day, or null when it never exists within the next four years (only `31/02`-style input)
 */
function firstOnOrAfter(
  month: number,
  day: number,
  notBefore: string,
): string | null {
  const startYear = Number(notBefore.slice(0, 4));

  // Four years always reach a 29/02.
  for (let year = startYear; year <= startYear + 4; year += 1) {
    const key = toDateKey(year, month, day);
    if (key !== null && key >= notBefore) return key;
  }

  return null;
}

/**
 * Read a day typed as `dd/mm` or `dd/mm/yyyy`.
 * A missing year picks the occurrence nearest `today`, so `02/01` typed on 28/12 means next year and
 * `27/12` typed on 02/01 means last year.
 * An end date has to follow its start date, so when `notBefore` is given a missing year picks the
 * first occurrence on or after it instead (within half a year): `05/01` ending a leave that starts
 * on 30/12 means next year.
 * @param text - What the member typed
 * @param today - Now, from `Clock`
 * @param notBefore - The start date (`YYYY-MM-DD`) the result may not precede, for an end date
 * @returns `YYYY-MM-DD` in the Vietnam calendar, or null when the text is not a real day
 */
export function parseLeaveDateInput(
  text: string,
  today: Date,
  notBefore?: string,
): string | null {
  const match = DATE_PATTERN.exec(text.trim());
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  if (match[4]) return toDateKey(Number(match[4]), month, day);

  if (notBefore) {
    const following = firstOnOrAfter(month, day, notBefore);
    const span = following
      ? (Date.parse(`${following}T00:00:00Z`) -
          Date.parse(`${notBefore}T00:00:00Z`)) /
        MS_PER_DAY
      : Infinity;
    if (following && span <= MAX_UNYEARED_SPAN_DAYS) return following;
  }

  const todayKey = vnDateKey(today);
  const todayYear = Number(todayKey.slice(0, 4));
  const todayMs = Date.parse(`${todayKey}T00:00:00Z`);

  const candidates = [todayYear - 1, todayYear, todayYear + 1]
    .map((year) => toDateKey(year, month, day))
    .filter((key): key is string => key !== null);
  if (candidates.length === 0) return null;

  const distance = (key: string): number =>
    Math.abs(Date.parse(`${key}T00:00:00Z`) - todayMs) / MS_PER_DAY;

  return candidates.reduce(
    (best, key) => (distance(key) < distance(best) ? key : best),
    candidates[0],
  );
}
