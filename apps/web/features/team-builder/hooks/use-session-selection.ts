"use client";

import type { SessionFormation } from "@shared/schemas";

import { resolveActiveSessionId } from "../lib/active-session";
import { isSessionEditable } from "../lib/session-status";
import { useFormationStore } from "../store/formation-store";

/** Which battle day of the week is open, and whether it still accepts edits. */
export interface SessionSelectionState {
  /** Battles of the week on screen, ordered by battle time */
  sessions: SessionFormation[];
  /** Battle whose tab is open; null when the week holds no battle */
  activeSessionId: string | null;
  /** Whether the open battle may still be rearranged */
  editable: boolean;
  /** Open another battle's tab */
  setActiveSession: (sessionId: string) => void;
}

/**
 * Resolve which battle tab is open. The stored id only wins while that battle
 * is still on screen, so deleting a battle or switching week falls back to a
 * sensible default instead of leaving the screen pointing at nothing.
 * @param sessions - Battles of the week on screen
 * @param isEditableWeek - Whether the week on screen is open for edits
 * @returns The open battle, its editability, and the tab setter
 */
export function useSessionSelection(
  sessions: SessionFormation[],
  isEditableWeek: boolean
): SessionSelectionState {
  const storedActiveId = useFormationStore((s) => s.activeSessionId);
  const setActiveSession = useFormationStore((s) => s.setActiveSession);

  const activeSessionId = resolveActiveSessionId(sessions, storedActiveId);
  const activeSession = sessions.find((s) => s.sessionId === activeSessionId);
  const editable = activeSession
    ? isSessionEditable(activeSession, isEditableWeek)
    : false;

  return { sessions, activeSessionId, editable, setActiveSession };
}
