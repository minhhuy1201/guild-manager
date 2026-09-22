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
 * Whether a key went to something inside a dialog. A screen's shortcuts act on what sits behind any
 * open dialog, so they stand down there rather than change it out of sight.
 * @param target - The keyboard event's target
 * @returns True when the target is inside an element with the dialog or alertdialog role
 */
export function isInsideDialog(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest('[role="dialog"], [role="alertdialog"]') !== null
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
