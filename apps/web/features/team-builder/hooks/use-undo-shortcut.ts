"use client";

import { useEffect, useEffectEvent } from "react";

import { belongsElsewhere } from "@/lib/keyboard-target";

/**
 * Bind Ctrl+Z (Cmd+Z on macOS) to the screen's undo while it is mounted.
 *
 * A key pressed inside a text field is left to the browser: there Ctrl+Z means "take back what I
 * just typed", and a formation undo would wipe the whole note instead. So is a key pressed inside
 * a dialog: the formation sits behind it, and an undo there would change it out of sight. Ctrl+Shift+Z
 * is left alone too - it is redo everywhere else. Unlike the save shortcut nothing is blocked while
 * there is nothing to undo, since the browser's own undo has no unwanted default to stop.
 * @param onUndo - The undo to run
 * @param enabled - Whether there is an edit to take back now
 */
export function useUndoShortcut(onUndo: () => void, enabled: boolean) {
  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (!enabled) return;
    if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey) {
      return;
    }
    // Lower-cased so Caps Lock, which reports "Z", still counts.
    if (event.key.toLowerCase() !== "z") return;
    if (belongsElsewhere(event.target)) return;

    event.preventDefault();
    onUndo();
  });

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
