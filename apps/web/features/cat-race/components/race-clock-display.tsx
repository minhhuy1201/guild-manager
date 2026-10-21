"use client";

import { useEffect, useState } from "react";

import { clockSeconds, formatClock, isClockRunning, type RaceClock } from "../lib/race-clock";

/** One decimal on the clock, so a tenth of a second is the finest change worth painting. */
const CLOCK_TICK_MS = 100;

interface RaceClockDisplayProps {
  clock: RaceClock;
}

/**
 * The seconds since "go": counting while the clock runs, frozen at its stop.
 * @param props.clock - The clock to show
 * @returns The seconds as text
 */
export function RaceClockDisplay({ clock }: RaceClockDisplayProps) {
  const [now, setNow] = useState(() => performance.now());
  const isRunning = isClockRunning(clock);

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setNow(performance.now()), CLOCK_TICK_MS);

    return () => clearInterval(id);
  }, [isRunning]);

  return (
    <span className="race-clock race-display" data-slot="race-clock">
      {formatClock(clockSeconds(clock, now))}
    </span>
  );
}
