/**
 * The sentence to show for a value thrown by a write.
 *
 * Every `Error` that reaches a dialog already carries text written for the
 * user: an `ApiError` holds the backend's Vietnamese message, and a
 * client-side check throws its own. The fallback is for what has nothing to
 * say — a network failure, a string, an `undefined`.
 * @param caught - Value thrown by the write
 * @param fallback - Sentence used when the value carries no message
 * @returns Message to render
 */
export function errorMessageOf(caught: unknown, fallback: string): string {
  if (caught instanceof Error && caught.message.trim().length > 0) {
    return caught.message;
  }

  return fallback;
}
