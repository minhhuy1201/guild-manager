"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";

import { belongsElsewhere, isTypingTarget } from "@/lib/keyboard-target";

/** Marks the focus mode dialog, so a key handler can tell it from a dialog opened over it. */
export const FOCUS_MODE_ATTRIBUTE = "data-focus-mode";

const OTHER_DIALOG_SELECTOR = `[role="dialog"]:not([${FOCUS_MODE_ATTRIBUTE}]), [role="alertdialog"]`;

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

interface FocusMode {
  /** Whether the focus mode overlay is showing */
  active: boolean;
  /** Open the overlay and ask the browser for fullscreen */
  enter: () => void;
  /** Close the overlay and leave browser fullscreen */
  exit: () => void;
}

/**
 * The state behind the team builder's focus mode: a local flag, kept in step with the browser's
 * fullscreen, and driven by `F` / `Esc`.
 *
 * The flag is plain React state - nothing persists a reload, which returns to the normal page.
 * Both keys stand down for a text field, a modified key, and a key an earlier handler already took
 * (`defaultPrevented`); `F` also for a dialog, `Esc` also while another dialog is open over the
 * overlay, so that dialog closes alone. Closing returns focus to the button that opened it.
 * @param enabled - Whether focus mode may be on; turning false closes it
 * @param returnFocusTo - The entry button, focused again on close
 * @returns The flag and its two actions
 */
export function useFocusMode(
  enabled: boolean,
  returnFocusTo: React.RefObject<HTMLElement | null>
): FocusMode {
  const [open, setOpen] = useState(false);
  const active = open && enabled;
  const wasActive = useRef(false);

  const enter = useCallback(() => {
    setOpen(true);
    void requestBrowserFullscreen();
  }, []);

  const exit = useCallback(() => {
    setOpen(false);
    void exitBrowserFullscreen();
  }, []);

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (!isPlainKey(event)) return;

    if (!active) {
      if (!enabled || event.key.toLowerCase() !== "f") return;
      if (belongsElsewhere(event.target)) return;

      event.preventDefault();
      enter();
      return;
    }

    if (event.key !== "Escape") return;
    if (isTypingTarget(event.target)) return;
    if (document.querySelector(OTHER_DIALOG_SELECTOR)) return;

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

  useEffect(() => {
    if (!enabled) void exitBrowserFullscreen();
  }, [enabled]);

  useEffect(() => {
    if (wasActive.current && !active) returnFocusTo.current?.focus();
    wasActive.current = active;
  }, [active, returnFocusTo]);

  return { active, enter, exit };
}
