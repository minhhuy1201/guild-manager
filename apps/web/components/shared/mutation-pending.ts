"use client";

import { createContext, useContext } from "react";

/**
 * The default: a form with no shell above it has no close to block, so there
 * is nothing to report to. Every `MutationForm` in the app sits inside a
 * `MutationDialogShell`; this branch exists so the type has no null in it.
 */
const NO_SHELL = () => {};

/**
 * How the write protocol tells the dialog around it that a write is in flight.
 * The shell is the only piece holding `onOpenChange`, so it is the only piece
 * that can refuse to close while the write is still running.
 */
export const MutationPendingContext =
  createContext<(isPending: boolean) => void>(NO_SHELL);

/**
 * The reporter a form calls when its write starts and when it settles.
 * @returns Function taking the new pending flag; a no-op with no shell above
 */
export function useReportMutationPending(): (isPending: boolean) => void {
  return useContext(MutationPendingContext);
}
