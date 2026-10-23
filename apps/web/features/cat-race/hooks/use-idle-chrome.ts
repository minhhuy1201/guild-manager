"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** How long the pointer may rest before the focus mode's controls fade out. */
export const CHROME_IDLE_MS = 2000;

interface IdleChrome {
  /** Whether the controls should be faded out right now */
  idle: boolean;
  /** Show the controls again and restart the countdown */
  wake: () => void;
}

/**
 * Tracks whether the pointer has rested long enough for a broadcast screen to hide its controls.
 * While disabled nothing listens and `idle` stays false.
 * @param enabled - Whether the controls may hide at all
 * @returns The idle flag and a way to wake the controls (a keyboard focus has to)
 */
export function useIdleChrome(enabled: boolean): IdleChrome {
  const [idle, setIdle] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const arm = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setIdle(true), CHROME_IDLE_MS);
  }, []);

  const wake = useCallback(() => {
    if (!enabled) return;

    setIdle(false);
    arm();
  }, [enabled, arm]);

  useEffect(() => {
    if (!enabled) return;

    arm();
    window.addEventListener("pointermove", wake);

    return () => {
      window.removeEventListener("pointermove", wake);
      window.clearTimeout(timer.current);
      setIdle(false);
    };
  }, [enabled, arm, wake]);

  return { idle: enabled && idle, wake };
}
