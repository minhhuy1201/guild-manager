"use client";

import { useSyncExternalStore } from "react";

/** The `lg` breakpoint Tailwind uses, the width the drawing tools need. */
const DESKTOP_QUERY = "(min-width: 1024px)";

/**
 * Subscribe to changes of the desktop media query.
 * @param onChange - Called whenever the query starts or stops matching
 * @returns The unsubscribe function
 */
function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(DESKTOP_QUERY);

  media.addEventListener("change", onChange);

  return () => media.removeEventListener("change", onChange);
}

/**
 * Whether the screen is wide enough to draw on.
 *
 * The editor and the viewer each mount their own Konva stage, so this is a real branch rather than
 * a pair of CSS classes: hiding one with `lg:hidden` would keep two canvases and two copies of the
 * map alive at once. On the server there is no width to read, so the answer is `null` and neither
 * branch renders until the browser has one.
 * @returns True on a wide screen, false on a narrow one, null on the server
 */
export function useIsDesktop(): boolean | null {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => null
  );
}
