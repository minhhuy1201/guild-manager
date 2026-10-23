"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";

import {
  belongsElsewhere,
  BLOCKING_DIALOG_SELECTOR,
  isTypingTarget,
} from "@/lib/keyboard-target";

/** Tailwind's `lg` breakpoint: below it the screen shows one team at a time and has no focus mode. */
const FOCUS_MODE_MEDIA_QUERY = "(min-width: 64rem)";

/**
 * Ask the browser for real fullscreen on the whole document.
 *
 * The root element, never a child: dialogs, popovers and toasts portal out to `body`, and only
 * the fullscreen element's subtree stays visible.
 */
async function requestBrowserFullscreen() {
  try {
    await document.documentElement.requestFullscreen?.();
  } catch {
    // Fullscreen is a bonus. The browser may refuse it (no user gesture, a policy, an iframe), and
    // the overlay already fills the window, so the mode works the same without it.
  }
}

/** Leave browser fullscreen, if the document is in it. */
async function exitBrowserFullscreen() {
  if (!document.fullscreenElement) return;

  try {
    await document.exitFullscreen();
  } catch {
    // The document left fullscreen by itself between the check and the call; nothing is left to undo.
  }
}

/**
 * Whether a keydown is a plain key press nobody else has claimed.
 * @param event - The keydown
 * @returns False for a modified key or one an earlier handler already took
 */
function isPlainKey(event: KeyboardEvent) {
  return !(
    event.defaultPrevented ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey
  );
}

/** Where focus goes when the mode closes. */
interface FocusReturn {
  /** The entry button, focused again on close */
  button: React.RefObject<HTMLElement | null>;
  /** Used when the button is gone - a battle that turned read-only drops it */
  fallback: React.RefObject<HTMLElement | null>;
}

interface FocusMode {
  /** Whether the focus mode overlay is showing */
  active: boolean;
  /** Open the overlay and ask the browser for fullscreen */
  enter: () => void;
  /** Close the overlay; browser fullscreen ends with it */
  exit: () => void;
}

/**
 * The state behind the team builder's focus mode: a local flag, kept in step with the browser's
 * fullscreen, and driven by `F` / `Esc`.
 *
 * The flag is plain React state - nothing persists a reload, which returns to the normal page.
 * Both keys stand down for a text field, a modified key, and a key an earlier handler already took
 * (`defaultPrevented`); `F` also for a dialog, `Esc` also while another dialog is open over the
 * overlay, so that dialog closes alone, and `Esc` during a drag, which cancels only the drag. `F`
 * does nothing below `lg`, where the entry button is hidden too. Closing returns focus to the
 * button that opened it.
 * @param enabled - Whether focus mode may be on; turning false closes it
 * @param dragging - Whether a member card is being dragged
 * @param returnFocusTo - Where focus goes on close
 * @returns The flag and its two actions
 */
export function useFocusMode(
  enabled: boolean,
  dragging: boolean,
  returnFocusTo: FocusReturn
): FocusMode {
  const [open, setOpen] = useState(false);
  const active = open && enabled;
  const wasActive = useRef(false);
  const fullscreenRequest = useRef<Promise<void>>(Promise.resolve());
  const openCount = useRef(0);

  const enter = useCallback(() => {
    setOpen(true);
    openCount.current += 1;
    fullscreenRequest.current = requestBrowserFullscreen();
  }, []);

  const exit = useCallback(() => setOpen(false), []);

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (!isPlainKey(event)) return;

    if (!active) {
      if (!enabled || event.key.toLowerCase() !== "f") return;
      if (belongsElsewhere(event.target)) return;
      if (!window.matchMedia(FOCUS_MODE_MEDIA_QUERY).matches) return;

      event.preventDefault();
      enter();
      return;
    }

    if (event.key !== "Escape" || dragging) return;
    if (isTypingTarget(event.target)) return;
    if (document.querySelector(BLOCKING_DIALOG_SELECTOR)) return;

    event.preventDefault();
    exit();
  });

  const handleFullscreenChange = useEffectEvent(() => {
    if (!active || document.fullscreenElement) return;

    setOpen(false);
  });

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // A battle that turns read-only has no pool to arrange: drop the flag while rendering (React's
  // pattern for state derived from props) and let the browser leave fullscreen in an effect.
  if (!enabled && open) setOpen(false);

  // Leaves the fullscreen this mode asked for however the mode ends - ✕, Esc, a read-only battle,
  // or the screen unmounting on a navigation - and never one the mode did not start. It waits for
  // the request, which may still be pending when the mode closes, and would land after the exit -
  // unless the mode has opened again meanwhile, whose fullscreen is not this one's to leave.
  useEffect(() => {
    if (!active) return;

    const request = fullscreenRequest.current;
    const opening = openCount.current;
    return () =>
      void request.then(() => {
        if (openCount.current === opening) return exitBrowserFullscreen();
      });
  }, [active]);

  useEffect(() => {
    if (wasActive.current && !active) {
      (returnFocusTo.button.current ?? returnFocusTo.fallback.current)?.focus();
    }
    wasActive.current = active;
  }, [active, returnFocusTo]);

  return { active, enter, exit };
}
