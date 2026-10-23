"use client";

import { useEffect, useState } from "react";

/** How long the pointer may rest before the focus mode's controls fade out. */
export const CHROME_IDLE_MS = 2000;

/**
 * Whether keyboard focus sits on a control. The focus mode frame itself takes focus with
 * `tabIndex={-1}` when it opens; that is not a control and must not hold the controls up.
 * @param target - The element that has focus
 * @returns True for an element in the Tab order
 */
function isControl(target: EventTarget | null) {
  return target instanceof HTMLElement && target.tabIndex >= 0;
}

/**
 * Tracks whether the pointer has rested long enough for a broadcast screen to hide its controls.
 * A pointer move shows them and restarts the countdown. While a control has focus they stay shown,
 * so a keyboard user never tabs onto something invisible; the countdown restarts once focus leaves.
 * While disabled nothing listens and the flag stays false.
 * @param enabled - Whether the controls may hide at all
 * @returns Whether the controls should be faded out right now
 */
export function useIdleChrome(enabled: boolean): boolean {
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let timer: number | undefined;
    let isHeld = isControl(document.activeElement);

    const wake = () => {
      setIdle(false);
      window.clearTimeout(timer);
      if (!isHeld) timer = window.setTimeout(() => setIdle(true), CHROME_IDLE_MS);
    };
    const holdOn = (event: FocusEvent) => {
      isHeld = isControl(event.target);
      wake();
    };
    const release = () => {
      isHeld = false;
      wake();
    };

    wake();
    window.addEventListener("pointermove", wake);
    window.addEventListener("focusin", holdOn);
    window.addEventListener("focusout", release);

    return () => {
      window.removeEventListener("pointermove", wake);
      window.removeEventListener("focusin", holdOn);
      window.removeEventListener("focusout", release);
      window.clearTimeout(timer);
      setIdle(false);
    };
  }, [enabled]);

  return enabled && idle;
}
