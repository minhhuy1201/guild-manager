/** Max letters in the fallback avatar — more overflows the 32px circle. */
const MAX_INITIALS = 2;

/**
 * Take a name's initials for the fallback shown when the avatar cannot load.
 * @param label - Character or Discord name, null when unknown
 * @returns At most two uppercase letters, or "?" when there is no name
 */
export function accountInitials(label: string | null): string {
  const words = label?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (words.length === 0) return "?";

  return words
    .slice(0, MAX_INITIALS)
    .map((word) => word[0].toUpperCase())
    .join("");
}
