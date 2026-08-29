/**
 * Vietnamese display label for an attendance answer.
 * @param isPresent - Whether the character signed up for the session
 * @returns "Có" when true, "Không" when false
 */
export function attendanceLabel(isPresent: boolean): string {
  return isPresent ? "Có" : "Không";
}
