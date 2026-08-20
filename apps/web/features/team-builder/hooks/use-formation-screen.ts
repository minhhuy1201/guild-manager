"use client";

import { useFormationDnd, type FormationDndState } from "./use-formation-dnd";
import {
  useFormationDraft,
  type FormationDraftState,
} from "./use-formation-draft";
import {
  useFormationPool,
  type FormationPoolState,
} from "./use-formation-pool";
import {
  useFormationWeek,
  type FormationWeekState,
} from "./use-formation-week";
import {
  useSessionSelection,
  type SessionSelectionState,
} from "./use-session-selection";

/** The five branches of the formation screen, kept apart on purpose. */
export interface FormationScreenState {
  /** Which week is on screen, and the loading state of everything below */
  week: FormationWeekState;
  /** Which battle day of that week is open */
  selection: SessionSelectionState;
  /** The open day's matches and every edit to them */
  draft: FormationDraftState;
  /** Who can still be placed, and the prefill proposal */
  pool: FormationPoolState;
  /** The drag gesture in flight */
  dnd: FormationDndState;
}

/**
 * Assemble the formation screen out of its five branches. This hook adds no
 * logic of its own — it only wires them in dependency order
 * (week → selection → draft → pool → dnd), which is one-way by design: no
 * branch returns data into an earlier one. The one exception is deliberate —
 * the pool seeds an empty day's draft through the store, never through here.
 * @returns The five branches, each with its own small interface
 */
export function useFormationScreen(): FormationScreenState {
  const week = useFormationWeek();
  const selection = useSessionSelection(week.sessions, week.isEditableWeek);
  const draft = useFormationDraft(
    selection.sessions,
    selection.activeSessionId,
    selection.editable,
    week.refetchFormations
  );
  const pool = useFormationPool(
    selection.sessions,
    selection.activeSessionId,
    selection.editable,
    week.characters,
    week.records,
    draft.assignment,
    draft.matches,
    draft.activeMatchIndex
  );
  const dnd = useFormationDnd(draft.applyDrop, pool.charactersById);

  return { week, selection, draft, pool, dnd };
}
