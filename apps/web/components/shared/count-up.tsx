"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";

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
 * arrived rather than popped in. It plays once per mount: a later change of `value` (a background
 * refetch) shows the new number at once. Under reduced motion it never counts.
 * @param props.value - The number to land on
 * @returns A span holding the current number
 */
export function CountUp({ value, ...props }: CountUpProps) {
  const isReduced = useReducedMotion();
  const [current, setCurrent] = useState(0);
  const [isSettled, setIsSettled] = useState(false);
  const hasPlayed = useRef(false);

  useEffect(() => {
    if (isReduced || hasPlayed.current) return;

    const start = performance.now();
    let frame = 0;

    /**
     * Advance the number to where the clock says it should be.
     * @param now - Timestamp of this frame
     */
    function tick(now: number) {
      const progress = Math.min((now - start) / COUNT_UP_DURATION_MS, 1);
      setCurrent(Math.round(value * easeOut(progress)));

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
        return;
      }
      hasPlayed.current = true;
      setIsSettled(true);
    }

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [value, isReduced]);

  return (
    <span {...props}>{isReduced || isSettled ? value : current}</span>
  );
}
