/**
 * Whether a key event came from a field someone is typing in.
 * @param target - The keyboard event's target
 * @returns True for an input, a textarea, or an editable element
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA"
  );
}

/**
 * Marks a dialog that is the screen itself in another frame (the team builder's focus mode), so a
 * screen shortcut still runs inside it. Any other dialog stands in front of the screen.
 */
export const SCREEN_DIALOG_ATTRIBUTE = "data-screen-dialog";

/** Every dialog that stands in front of a screen, leaving out one marked as the screen itself. */
export const BLOCKING_DIALOG_SELECTOR = `[role="dialog"]:not([${SCREEN_DIALOG_ATTRIBUTE}]), [role="alertdialog"]`;

/**
 * Whether a key went to something inside a dialog. A screen's shortcuts act on what sits behind any
 * open dialog, so they stand down there rather than change it out of sight.
 * @param target - The keyboard event's target
 * @returns True when the target is inside a dialog other than one marked as the screen itself
 */
export function isInsideDialog(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest(BLOCKING_DIALOG_SELECTOR) !== null
  );
}

/**
 * Whether a key belongs to something other than the screen's own shortcuts: a field taking the
 * keystroke as text, or a dialog standing in front of the screen.
 * @param target - The keyboard event's target
 * @returns True when a screen shortcut must leave the key alone
 */
export function belongsElsewhere(target: EventTarget | null): boolean {
  return isTypingTarget(target) || isInsideDialog(target);
}
