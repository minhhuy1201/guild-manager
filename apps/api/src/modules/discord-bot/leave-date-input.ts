import { vnDateKey } from '@guild/shared/lib';

const DATE_PATTERN = /^(\d{1,2})\/(\d{1,2})(\/(\d{4}))?$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

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
 * Read a day typed as `dd/mm` or `dd/mm/yyyy`.
 * A missing year picks the occurrence nearest `today`, so `02/01` typed on 28/12 means next year and
 * `27/12` typed on 02/01 means last year.
 * @param text - What the member typed
 * @param today - Now, from `Clock`
 * @returns `YYYY-MM-DD` in the Vietnam calendar, or null when the text is not a real day
 */
export function parseLeaveDateInput(text: string, today: Date): string | null {
  const match = DATE_PATTERN.exec(text.trim());
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  if (match[4]) return toDateKey(Number(match[4]), month, day);

  const todayKey = vnDateKey(today);
  const todayYear = Number(todayKey.slice(0, 4));
  const todayMs = Date.parse(`${todayKey}T00:00:00Z`);

  const candidates = [todayYear - 1, todayYear, todayYear + 1]
    .map((year) => toDateKey(year, month, day))
    .filter((key): key is string => key !== null);
  if (candidates.length === 0) return null;

  const distance = (key: string): number =>
    Math.abs(Date.parse(`${key}T00:00:00Z`) - todayMs) / MS_PER_DAY;

  return candidates.reduce((best, key) =>
    distance(key) < distance(best) ? key : best,
  );
}
