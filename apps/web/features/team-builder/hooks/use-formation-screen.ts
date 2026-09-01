"use client";

import type { TeamNames } from "@guild/shared/schemas";

import {
  useFormationCopy,
  type FormationCopyState,
} from "./use-formation-copy";
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
import {
  useTeamNameDraft,
  type TeamNameDraftState,
} from "./use-team-name-draft";
import { useTeamNames } from "./use-team-names";

/** Stable stand-in while the names are still loading, so memos do not rerun. */
const EMPTY_TEAM_NAMES: TeamNames = {};

/** The seven branches of the formation screen, kept apart on purpose. */
export interface FormationScreenState {
  /** Which week is on screen, and the loading state of everything below */
  week: FormationWeekState;
  /** Which battle day of that week is open */
  selection: SessionSelectionState;
  /** The open day's matches and every edit to them */
  draft: FormationDraftState;
  /** Who can still be placed, and the prefill proposal */
  pool: FormationPoolState;
  /** Where the copy button would copy from, and the action itself */
  copy: FormationCopyState;
  /** The drag gesture in flight */
  dnd: FormationDndState;
  /** The team column names and their own draft */
  teamNames: TeamNameDraftState;
}

/**
 * Assemble the formation screen out of its seven branches. This hook adds no
 * logic of its own — it only wires them in dependency order
 * (week → selection → draft → pool → copy → dnd), which is one-way by design: no
 * branch returns data into an earlier one. The prefill is no exception: the
 * pool computes a proposal and hands it forward through `draft.seedFrom`,
 * which the draft branch alone decides what to do with. The copy button works
 * the same way, through `draft.copyIntoActiveMatch`.
 *
 * `teamNames` hangs off nothing: the names are global, so unlike every other
 * branch it needs neither the week nor the open battle day.
 * @returns The seven branches, each with its own small interface
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
    draft.activeMatchIndex,
    draft.seedFrom
  );
  const copy = useFormationCopy(
    selection.sessions,
    selection.activeSessionId,
    selection.editable,
    week.weeks,
    week.weekStart,
    draft.matchesBySession,
    pool.presentIds,
    draft.copyIntoActiveMatch
  );
  const dnd = useFormationDnd(draft.applyDrop, pool.charactersById);
  const teamNamesQuery = useTeamNames();
  const teamNames = useTeamNameDraft(teamNamesQuery.data ?? EMPTY_TEAM_NAMES);

  return { week, selection, draft, pool, copy, dnd, teamNames };
}
