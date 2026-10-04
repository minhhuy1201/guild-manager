"use client";

import { useMemo, useState } from "react";
import type { TeamNames, TeamNamesState } from "@guild/shared/schemas";

import { ApiError } from "@/lib/api-client";
import { countNameChanges } from "../lib/team-name-diff";
import { useTeamNameStore } from "../store/team-name-store";
import { useSaveTeamNames } from "./use-save-team-names";

/** HTTP status the backend returns when the draft's base version is no longer current. */
const STALE_STATUS = 412;

/** The team names on screen, and everything that edits and saves them. */
export interface TeamNameDraftState {
  /** Names currently shown — the draft where one exists, the saved copy otherwise */
  names: TeamNames;
  /** Whether the names differ from the saved copy */
  dirty: boolean;
  /** How many teams carry a name different from the saved copy */
  changeCount: number;
  /** True while the save request is in flight */
  saving: boolean;
  /** Message of the last failed save, undefined when the last save was fine */
  saveErrorMessage: string | undefined;
  /** Write one team's name; an empty name clears it back to the team number */
  setName: (team: number, name: string) => void;
  /** Discard the draft, falling back to the saved copy */
  reset: () => void;
  /** Persist the whole map. A no-op while nothing differs from the saved copy. */
  save: () => Promise<void>;
  /** The last save was refused as stale (412); the draft is still there */
  isStale: boolean;
  /** Throw the draft away, mark the flag off and reload the saved copy */
  discardStale: () => void;
  /** Re-base the draft on the latest saved version and save it again */
  overwriteStale: () => Promise<void>;
  /** Close the conflict without choosing: the flag goes off, the draft stays */
  dismissStale: () => void;
}

/**
 * The team names layer: merges the saved map from TanStack Query with the draft
 * held in Zustand. Mirrors `useFormationDraft` deliberately — the screen wires
 * both into one Save button, so the two must behave the same way about what a
 * draft is and what a failed save leaves behind.
 *
 * The names are global, so this hook takes no session: unlike the formation,
 * nothing about them depends on which battle day is open.
 * @param saved - The names as the server has them, with their version
 * @param refetchSaved - Reload the saved names, for reloading or overwriting a stale save
 * @returns The names on screen plus the handlers that edit and save them
 */
export function useTeamNameDraft(
  saved: TeamNamesState,
  refetchSaved: () => Promise<TeamNamesState>
): TeamNameDraftState {
  const draft = useTeamNameStore((s) => s.draft);
  const setNameInStore = useTeamNameStore((s) => s.setName);
  const clearDraft = useTeamNameStore((s) => s.clearDraft);
  const rebase = useTeamNameStore((s) => s.rebase);

  const saveMutation = useSaveTeamNames();
  const [isStale, setIsStale] = useState(false);

  const names = draft ?? saved.names;

  // Compared by value, not by reference: retyping the name a team already had
  // leaves a draft in place that is equal to the saved copy, and that is not an
  // unsaved change.
  const changeCount = useMemo(
    () => countNameChanges(names, saved.names),
    [names, saved.names]
  );
  const dirty = changeCount > 0;

  /**
   * Persist the whole map, then drop the draft so the query's copy shows through.
   * A failed save keeps the draft: the toolbar shows the message and the user retries. A 412 sets
   * `isStale` instead, and the conflict dialog offers reload or overwrite.
   */
  async function save() {
    if (!dirty) return;

    try {
      await saveMutation.mutateAsync({
        names,
        // Read from the store, not a render's closure: `overwriteStale` re-bases and saves in the
        // same tick. A draft always carries its base version; `saved.version` only types the gap.
        version: useTeamNameStore.getState().baseVersion ?? saved.version,
      });
      clearDraft();
      setIsStale(false);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === STALE_STATUS) {
        setIsStale(true);
      }
      // Anything else is swallowed on purpose: the message is read off the mutation below, and
      // rethrowing here would take the formation's save down with it when the
      // screen runs both in one Promise.all.
    }
  }

  /** Throw the stale draft away and show what the other save wrote. */
  function discardStale() {
    clearDraft();
    setIsStale(false);
    // A failed reload shows through the names query's own error state; nothing to add here.
    refetchSaved().catch(() => undefined);
  }

  /** Save the draft over whatever is stored now; a second 412 keeps the flag on. */
  async function overwriteStale() {
    rebase((await refetchSaved()).version);
    await save();
  }

  return {
    names,
    dirty,
    changeCount,
    saving: saveMutation.isPending,
    saveErrorMessage:
      saveMutation.error instanceof ApiError &&
      saveMutation.error.statusCode !== STALE_STATUS
        ? saveMutation.error.message
        : undefined,
    setName: (team, name) => setNameInStore(saved, team, name),
    reset: clearDraft,
    save,
    isStale,
    discardStale,
    overwriteStale,
    dismissStale: () => setIsStale(false),
  };
}
