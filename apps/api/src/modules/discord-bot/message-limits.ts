/**
 * Fitting a list into one Discord message.
 *
 * Discord rejects the whole message when `content` passes 2000 characters or an embed's
 * `description` passes 4096 — a 400 that surfaces as `DiscordApiError` and leaves the guild with no
 * reminder at all that morning. The guild only has to grow, or a few days' deadlines only have to
 * fall together, for that to happen.
 *
 * Trimming, not batching: a reminder split across three messages is three messages people scroll
 * past. One message that names as many as fit and counts the rest stays readable, and the count is
 * what tells an admin something was left out.
 */

/** What to do with a list that does not fit. */
export interface LimitOptions {
  /** String placed between items */
  separator: string;
  /** Characters available for the joined result */
  limit: number;
  /** Sentence naming how many items were left out, appended after the separator */
  more: (count: number) => string;
}

/** A list fitted to a budget: the items kept, and the text to send. */
export interface LimitedList {
  /** The kept items — always a prefix of the input, so a caller can map back by length */
  kept: string[];
  /** The joined text, never longer than `limit` */
  text: string;
}

/**
 * Join as many items as fit, replacing the tail with a count of what was dropped.
 *
 * Tries the whole list first and walks down, so the answer is always the longest prefix that fits
 * *including* its own trailing count — which is why the count cannot be computed up front: dropping
 * one more item shortens the list and lengthens the suffix at the same time.
 *
 * @param items - The pieces, in the order they matter
 * @param options - Separator, character budget, and how to name the remainder
 * @returns The kept items and the text to send
 */
export function takeWithinLimit(
  items: readonly string[],
  options: LimitOptions,
): LimitedList {
  if (items.length === 0) return { kept: [], text: '' };

  for (let take = items.length; take > 0; take -= 1) {
    const kept = items.slice(0, take);
    const suffix =
      take === items.length
        ? ''
        : options.separator + options.more(items.length - take);
    const text = kept.join(options.separator) + suffix;

    if (text.length <= options.limit) return { kept, text };
  }

  // Not even one item fits. Say how many there were rather than sending nothing at all.
  return { kept: [], text: options.more(items.length).slice(0, options.limit) };
}
