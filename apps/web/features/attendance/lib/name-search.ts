/**
 * Lowercase a name and strip its Vietnamese marks, so "cun" finds "Cún" and "dai" finds "Đại".
 * `đ` has no decomposition, so it is mapped by hand.
 * @param text - A name or what was typed
 * @returns The comparison form
 */
function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();
}

/**
 * Whether a name matches what was typed in a search box.
 * Both sides go through the same folding; a blank query keeps everyone.
 * @param name - Display name
 * @param query - Text typed in the box
 * @returns True when the name contains the query
 */
export function matchesName(name: string, query: string): boolean {
  const needle = fold(query.trim());

  return needle.length === 0 || fold(name).includes(needle);
}
