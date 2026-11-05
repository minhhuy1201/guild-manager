import { belongsElsewhere } from "@/lib/keyboard-target";

/**
 * Whether a key event is the plain "S" that skips the race or its reveal, and not a modified
 * press, a handled one, or one meant for a field or dialog.
 * @param event - The keydown event
 * @returns True when the screen should skip
 */
export function isSkipKey(event: KeyboardEvent): boolean {
  if (event.key.toLowerCase() !== "s") return false;
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return false;

  return !belongsElsewhere(event.target);
}
