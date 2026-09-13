"use client";

import { useEffect, useEffectEvent } from "react";

/**
 * Bind Ctrl+S (Cmd+S on macOS) to the screen's save while it is mounted.
 *
 * The browser's own "save page" dialog is blocked even when there is nothing to save: on this
 * screen the shortcut means "save the formation", and a dialog offering to download the HTML is
 * never what the admin wanted.
 * @param onSave - The save the Save button runs
 * @param enabled - Whether a save may start now - something unsaved, nothing in flight
 */
export function useSaveShortcut(onSave: () => void, enabled: boolean) {
  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    // Lower-cased so Caps Lock, which reports "S", still counts.
    if (event.key.toLowerCase() !== "s") return;

    event.preventDefault();
    if (enabled) onSave();
  });

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
