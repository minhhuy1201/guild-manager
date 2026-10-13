"use client";

import { useSyncExternalStore } from "react";

/** The query an operating system answers when its owner asked for less movement. */
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Subscribe to changes of the reduced-motion query.
 * @param onChange - Called whenever the query starts or stops matching
 * @returns The unsubscribe function
 */
function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(REDUCED_MOTION_QUERY);

  media.addEventListener("change", onChange);

  return () => media.removeEventListener("change", onChange);
}

/**
 * Whether the viewer asked their system for less movement.
 *
 * The server has nothing to read, and false is the safe answer there: the first client render then
 * settles to the real one without an animation having run in between.
 * @returns True when the system asks for reduced motion
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false
  );
}
