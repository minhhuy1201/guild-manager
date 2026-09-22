"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useUnsavedGuard } from "./use-unsaved-guard";

/** What the leave dialog renders from. */
export interface LeaveGuard {
  /** Where a held-back link led, while the dialog asks what to do; null when nothing is held */
  leavingTo: string | null;
  /** Whether "save and leave" is waiting on the save */
  saving: boolean;
  /** Close the dialog and keep drawing */
  stay: () => void;
  /** Follow the link and let the drawing go */
  discard: () => void;
  /** Save, then follow the link; a failed save keeps the admin on the page */
  saveAndLeave: () => Promise<void>;
}

/**
 * Guard an unsaved drawing against every way of leaving the page.
 *
 * A reload or a closed tab gets the browser's own confirmation (`useUnsavedGuard`). An in-app link
 * cannot: the App Router has no navigation event to cancel, so the click itself is held back in the
 * capture phase, before it reaches the `<Link>` that would navigate, and the destination waits for
 * the admin's answer.
 * @param dirty - Whether the draft holds edits the server has not seen
 * @param save - Persist the draft; resolves true once the server accepted it
 * @returns The held destination and the three answers to it
 */
export function useLeaveGuard(
  dirty: boolean,
  save: () => Promise<boolean>
): LeaveGuard {
  const router = useRouter();
  const [leavingTo, setLeavingTo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useUnsavedGuard(dirty);

  useEffect(() => {
    if (!dirty) {
      return;
    }

    /**
     * Hold back a click that would take the admin to another page of the app.
     * @param event - The click, seen before any element handles it
     */
    function handleClick(event: MouseEvent) {
      const href = inAppDestination(event);

      if (href === null) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setLeavingTo(href);
    }

    window.addEventListener("click", handleClick, { capture: true });

    return () =>
      window.removeEventListener("click", handleClick, { capture: true });
  }, [dirty]);

  const stay = useCallback(() => setLeavingTo(null), []);

  const discard = useCallback(() => {
    if (leavingTo) router.push(leavingTo);
  }, [leavingTo, router]);

  const saveAndLeave = useCallback(async () => {
    setSaving(true);
    const saved = await save();
    setSaving(false);

    // A failed save has already said why in a toast; the dialog gets out of the way so the admin
    // can see the drawing it is about.
    if (saved && leavingTo) router.push(leavingTo);
    else setLeavingTo(null);
  }, [leavingTo, router, save]);

  return { leavingTo, saving, stay, discard, saveAndLeave };
}

/**
 * The in-app page a click is about to open, when it is one worth holding back.
 * @param event - A click anywhere in the document
 * @returns The destination path, or null for a click that leaves the drawing where it is
 */
function inAppDestination(event: MouseEvent): string | null {
  // A modified or non-primary click opens a new tab or window; the drawing stays open here.
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return null;
  }

  const anchor =
    event.target instanceof Element ? event.target.closest("a[href]") : null;

  if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank") {
    return null;
  }

  const url = new URL(anchor.href);

  if (
    url.origin !== window.location.origin ||
    url.pathname === window.location.pathname
  ) {
    return null;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
