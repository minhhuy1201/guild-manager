"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

/** How long the number takes to reach its value. */
const COUNT_UP_DURATION_MS = 700;

/**
 * Ease-out cubic: fast first, settling on the value.
 * @param progress - Fraction of the duration elapsed, 0 to 1
 * @returns The fraction of the distance covered
 */
function easeOut(progress: number): number {
  return 1 - (1 - progress) ** 3;
}

interface CountUpProps extends Omit<ComponentProps<"span">, "children"> {
  /** The number to land on */
  value: number;
}

/**
 * A number that counts up from zero the first time it appears, so a table of totals feels like it
 * arrived rather than popped in. It plays once per mount: a change of `value` mid-count steers the
 * running count to the new number, and a later change shows it at once. Under reduced motion it
 * never counts. An invisible copy of the final value shares the grid cell, so the width is the
 * final one from the first frame and the surrounding layout never shifts.
 * @param props.value - The number to land on
 * @returns A span holding the current number
 */
export function CountUp({ value, className, ...props }: CountUpProps) {
  const isReduced = useReducedMotion();
  const [current, setCurrent] = useState(0);
  const [isSettled, setIsSettled] = useState(false);
  const latestValue = useRef(value);

  useEffect(() => {
    latestValue.current = value;
  }, [value]);

  // Seen without motion counts as played: turning reduced motion off later must not replay it.
  // Adjusted during render, React's pattern for state derived from a changing input.
  if (isReduced && !isSettled) setIsSettled(true);

  useEffect(() => {
    if (isSettled) return;

    const start = performance.now();
    let frame = 0;

    /**
     * Advance the number to where the clock says it should be.
     * @param now - Timestamp of this frame
     */
    function tick(now: number) {
      const progress = Math.min((now - start) / COUNT_UP_DURATION_MS, 1);
      setCurrent(Math.round(latestValue.current * easeOut(progress)));

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
        return;
      }
      setIsSettled(true);
    }

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [isSettled]);

  return (
    <span className={cn("inline-grid", className)} {...props}>
      <span data-slot="count-up-value" className="col-start-1 row-start-1">
        {isSettled ? value : current}
      </span>
      <span aria-hidden className="invisible col-start-1 row-start-1">
        {value}
      </span>
    </span>
  );
}
