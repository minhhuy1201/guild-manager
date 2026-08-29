"use client";

import { useMemo } from "react";
import type { TeamNames } from "@guild/shared/schemas";

import { ApiError } from "@/lib/api-client";
import { useTeamNameStore } from "../store/team-name-store";
import { useSaveTeamNames } from "./use-save-team-names";

/** The team names on screen, and everything that edits and saves them. */
export interface TeamNameDraftState {
  /** Names currently shown — the draft where one exists, the saved copy otherwise */
  names: TeamNames;
  /** Whether the names differ from the saved copy */
  dirty: boolean;
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
}

/**
 * The team names layer: merges the saved map from TanStack Query with the draft
 * held in Zustand. Mirrors `useFormationDraft` deliberately — the screen wires
 * both into one Save button, so the two must behave the same way about what a
 * draft is and what a failed save leaves behind.
 *
 * The names are global, so this hook takes no session: unlike the formation,
 * nothing about them depends on which battle day is open.
 * @param saved - The names as the server has them
 * @returns The names on screen plus the handlers that edit and save them
 */
export function useTeamNameDraft(saved: TeamNames): TeamNameDraftState {
  const draft = useTeamNameStore((s) => s.draft);
  const setNameInStore = useTeamNameStore((s) => s.setName);
  const clearDraft = useTeamNameStore((s) => s.clearDraft);

  const saveMutation = useSaveTeamNames();

  const names = draft ?? saved;

  // Compared by value, not by reference: retyping the name a team already had
  // leaves a draft in place that is equal to the saved copy, and that is not an
  // unsaved change.
  const dirty = useMemo(() => !isSameNames(names, saved), [names, saved]);

  /**
   * Persist the whole map, then drop the draft so the query's copy shows through.
   * A failed save keeps the draft: the toolbar shows the message and the user retries.
   */
  async function save() {
    if (!dirty) return;

    try {
      await saveMutation.mutateAsync(names);
      clearDraft();
    } catch {
      // Swallowed on purpose: the message is read off the mutation below, and
      // rethrowing here would take the formation's save down with it when the
      // screen runs both in one Promise.all.
    }
  }

  return {
    names,
    dirty,
    saving: saveMutation.isPending,
    saveErrorMessage:
      saveMutation.error instanceof ApiError
        ? saveMutation.error.message
        : undefined,
    setName: (team, name) => setNameInStore(saved, team, name),
    reset: clearDraft,
    save,
  };
}

/**
 * Whether two name maps hold the same names for the same teams.
 * @param a - One map
 * @param b - The other map
 * @returns true when both carry the same keys with the same values
 */
function isSameNames(a: TeamNames, b: TeamNames): boolean {
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;

  return keys.every((key) => a[key] === b[key]);
}
