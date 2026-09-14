/**
 * Whether a key went to something inside a dialog. The screen's shortcuts act on the formation,
 * which sits behind any open dialog, so they stand down there rather than change it out of sight.
 * @param target - The keyboard event's target
 * @returns True when the target is inside an element with the dialog or alertdialog role
 */
export function isInsideDialog(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest('[role="dialog"], [role="alertdialog"]') !== null
  );
}
