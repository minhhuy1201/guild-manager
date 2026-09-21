"use client";

import { useSyncExternalStore } from "react";

/** What the shortcut modifier is called on a Mac, and everywhere else. */
const MAC_MODIFIER = "⌘";
const DEFAULT_MODIFIER = "Ctrl";

/** What an Apple keyboard's user agent says. */
const APPLE_AGENT = /Mac|iPhone|iPad/;

/**
 * Subscribe to changes of the platform. There are none — the machine does not change under the
 * page — but `useSyncExternalStore` needs one to hand the snapshot back through.
 * @returns The unsubscribe function
 */
function subscribe(): () => void {
  return () => {};
}

/**
 * What to call the shortcut modifier on this machine: "⌘" on a Mac, "Ctrl" everywhere else.
 *
 * The platform is only knowable in the browser, so the server renders "Ctrl" and a Mac swaps the
 * label in as it hydrates. Reading `navigator` during render instead would make the server's markup
 * and the client's first one disagree, which is a hydration error rather than a wrong label.
 * @returns The modifier's name
 */
export function useModifierKey(): string {
  return useSyncExternalStore(
    subscribe,
    () => (APPLE_AGENT.test(navigator.userAgent) ? MAC_MODIFIER : DEFAULT_MODIFIER),
    () => DEFAULT_MODIFIER
  );
}
