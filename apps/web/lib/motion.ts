import type { CSSProperties } from "react";

/** Delay between two consecutive items of a revealed list. */
const REVEAL_STEP_MS = 40;

/** Items past this index share its delay, so a long list never keeps its tail waiting. */
const REVEAL_MAX_INDEX = 8;

/**
 * Class of an item that fades and rises into place when it first mounts. The animation fills
 * `backwards` only, so no transform is left on the element afterwards (see frontend.md §6, Motion).
 */
export const REVEAL_CLASS = "animate-reveal";

/**
 * Animation delay for the `index`-th item of a freshly loaded list, so the items arrive one beat
 * after another instead of all at once. Pair it with `REVEAL_CLASS`.
 * @param index - Position of the item in its list
 * @returns The inline style carrying the delay
 */
export function revealStyle(index: number): CSSProperties {
  return {
    animationDelay: `${Math.min(index, REVEAL_MAX_INDEX) * REVEAL_STEP_MS}ms`,
  };
}
