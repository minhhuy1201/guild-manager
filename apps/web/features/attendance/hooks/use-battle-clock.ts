"use client";

import { useEffect, useState } from "react";
import type { BattleSession } from "@guild/shared/schemas";

/**
 * The current instant, renewed exactly when the next battle time passes, so a screen that splits a
 * week into upcoming and fought battles moves a battle across without the page being reloaded.
 * Unlike `useDeadlineRefresh` this needs no refetch: "fought" is read from the battle time the
 * client already holds.
 * @param sessions - Sessions of the open week (empty array while loading)
 * @returns The instant to measure battle times against
 */
export function useBattleClock(sessions: Pick<BattleSession, "dateTime">[]): Date {
  const [now, setNow] = useState(() => new Date());
  const nextBattle = findNextBattle(sessions, now);

  useEffect(() => {
    if (nextBattle === null) return;

    const timer = setTimeout(
      () => setNow(new Date()),
      Math.max(nextBattle - Date.now(), 0)
    );

    return () => clearTimeout(timer);
  }, [nextBattle]);

  return now;
}

/**
 * Finds the soonest battle time after the given instant.
 * @param sessions - Sessions of the open week
 * @param now - The instant to measure against
 * @returns Timestamp in milliseconds, or null when every battle is over
 */
function findNextBattle(
  sessions: Pick<BattleSession, "dateTime">[],
  now: Date
): number | null {
  const upcoming = sessions
    .map((session) => new Date(session.dateTime).getTime())
    .filter((time) => time > now.getTime());

  return upcoming.length === 0 ? null : Math.min(...upcoming);
}
