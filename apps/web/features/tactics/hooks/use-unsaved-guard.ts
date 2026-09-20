"use client";

import { useEffect } from "react";

/**
 * Ask the browser to confirm before leaving with unsaved edits.
 * Saving is manual here, so a reload or a closed tab is the one way a drawing can be lost without
 * the admin choosing it.
 * @param dirty - Whether the draft holds edits the server has not seen
 */
export function useUnsavedGuard(dirty: boolean): void {
  useEffect(() => {
    if (!dirty) {
      return;
    }

    /**
     * Turn the navigation into the browser's own confirmation.
     * @param event - The beforeunload event
     */
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);
}
