const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** How long until a deadline, in words, and whether it is close enough to stand out. */
export interface TimeLeft {
  /** "còn 2 ngày", "còn 5 giờ", "còn 45 phút" or "sắp khoá" */
  label: string;
  /** Less than a day left — the deadline line takes the accent */
  isUrgent: boolean;
}

/**
 * Say how long is left before a battle's deadline, in the largest whole unit. Display only: whether
 * the battle is locked is the API's `isDeadlinePassed`, never this. A client clock already past the
 * deadline, while the API has not locked the battle yet, reads "sắp khoá" rather than "đã khoá" -
 * the two clocks disagree for a moment, and the server's is the one that counts.
 * @param deadline - The deadline as the API sends it (ISO)
 * @param now - The current time
 * @returns The phrase and whether less than a day is left
 */
export function timeLeft(deadline: string, now: Date): TimeLeft {
  const remaining = new Date(deadline).getTime() - now.getTime();
  const isUrgent = remaining < DAY_MS;

  if (remaining >= DAY_MS) {
    return { label: `còn ${Math.floor(remaining / DAY_MS)} ngày`, isUrgent };
  }
  if (remaining >= HOUR_MS) {
    return { label: `còn ${Math.floor(remaining / HOUR_MS)} giờ`, isUrgent };
  }
  if (remaining >= MINUTE_MS) {
    return { label: `còn ${Math.floor(remaining / MINUTE_MS)} phút`, isUrgent };
  }
  return { label: "sắp khoá", isUrgent };
}
