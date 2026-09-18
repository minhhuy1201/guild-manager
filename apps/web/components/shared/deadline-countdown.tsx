"use client";

import { useEffect, useState } from "react";

import { timeLeft } from "@/lib/time-left";
import { cn } from "@/lib/utils";

/** How often the phrase is recomputed: its smallest unit is the minute. */
const TICK_MS = 60 * 1000;

interface DeadlineCountdownProps {
  /** The deadline as the API sends it (ISO) */
  deadline: string;
}

/**
 * "còn 5 giờ" beside a battle's deadline. It keeps its own clock, ticking once a minute, so only
 * this phrase re-renders - never the tile, the row or the table around it. Less than a day left
 * takes the working colour, navy (amber already means "not answered", red means "Không").
 *
 * Display only: the lock itself is the API's `isAttendanceClosed`, and `useDeadlineRefresh` is still
 * what refetches when a deadline passes.
 * @param deadline - The deadline as the API sends it
 * @returns The countdown phrase
 */
export function DeadlineCountdown({ deadline }: DeadlineCountdownProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const { label, isUrgent } = timeLeft(deadline, now);

  return (
    // The server renders with its own clock and the browser hydrates with another, so the phrase
    // can differ by a minute between the two; the client's is the one to keep.
    <span
      suppressHydrationWarning
      className={cn(isUrgent && "font-semibold text-primary")}
    >
      {label}
    </span>
  );
}
