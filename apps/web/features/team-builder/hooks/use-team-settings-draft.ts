"use client";

import { useMemo, useState } from "react";
import type { TeamColor, TeamIcon } from "@guild/shared/enums";
import type {
  TeamColors,
  TeamIcons,
  TeamNames,
  TeamSettingsState,
} from "@guild/shared/schemas";

import { toastSuccess } from "@/components/shared/toast";
import { ApiError } from "@/lib/api-client";
import { countSettingChanges } from "../lib/team-settings-diff";
import { useTeamSettingsStore } from "../store/team-settings-store";
import { useSaveTeamSettings } from "./use-save-team-settings";

/** HTTP status the backend returns when the draft's base version is no longer current. */
const STALE_STATUS = 412;

/** The team names, colours and icons on screen, and everything that edits and saves them. */
export interface TeamSettingsDraftState {
  /** Names currently shown — the draft where one exists, the saved copy otherwise */
  names: TeamNames;
  /** Chosen colours currently shown; a team with no key is on its default colour */
  colors: TeamColors;
  /** Chosen icons currently shown; a team with no key shows its colour dot */
  icons: TeamIcons;
  /** Whether the names, colours or icons differ from the saved copy */
  dirty: boolean;
  /** How many name, colour and icon fields differ from the saved copy */
  changeCount: number;
  /** True while the save request is in flight */
  saving: boolean;
  /** Message of the last failed save, undefined when the last save was fine */
  saveErrorMessage: string | undefined;
  /** Write one team's name; an empty name clears it back to the team number */
  setName: (team: number, name: string) => void;
  /** Write one team's colour; `null` puts the team back on its default colour */
  setColor: (team: number, color: TeamColor | null) => void;
  /** Write one team's icon; `null` puts the team back on its colour dot */
  setIcon: (team: number, icon: TeamIcon | null) => void;
  /** Discard the draft, falling back to the saved copy */
  reset: () => void;
  /** Persist the whole bundle. A no-op while nothing differs from the saved copy. */
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
 * The team settings layer: merges the saved bundle from TanStack Query with the draft
 * held in Zustand. Mirrors `useFormationDraft` deliberately — the screen wires
 * both into one Save button, so the two must behave the same way about what a
 * draft is and what a failed save leaves behind.
 *
 * The settings are global, so this hook takes no session: unlike the formation,
 * nothing about them depends on which battle day is open.
 * @param saved - The names, colours and icons as the server has them, with their version
 * @param refetchSaved - Reload the saved settings, for reloading or overwriting a stale save
 * @returns The settings on screen plus the handlers that edit and save them
 */
export function useTeamSettingsDraft(
  saved: TeamSettingsState,
  refetchSaved: () => Promise<TeamSettingsState>
): TeamSettingsDraftState {
  const draft = useTeamSettingsStore((s) => s.draft);
  const setNameInStore = useTeamSettingsStore((s) => s.setName);
  const setColorInStore = useTeamSettingsStore((s) => s.setColor);
  const setIconInStore = useTeamSettingsStore((s) => s.setIcon);
  const clearDraft = useTeamSettingsStore((s) => s.clearDraft);
  const rebase = useTeamSettingsStore((s) => s.rebase);

  const saveMutation = useSaveTeamSettings();
  const [isStale, setIsStale] = useState(false);

  const shown = draft ?? saved;

  // Compared by value, not by reference: retyping the name a team already had
  // (or picking its saved colour or icon again) leaves a draft in place that is equal to the saved copy, and that is not an
  // unsaved change.
  const changeCount = useMemo(
    () => countSettingChanges(shown, saved),
    [shown, saved]
  );
  const dirty = changeCount > 0;

  /**
   * Persist the whole bundle, then drop the draft so the query's copy shows through.
   * A failed save keeps the draft: the toolbar shows the message and the user retries. A 412 sets
   * `isStale` instead, and the conflict dialog offers reload or overwrite.
   */
  async function save() {
    if (!dirty) return;

    try {
      await saveMutation.mutateAsync({
        names: shown.names,
        colors: shown.colors,
        icons: shown.icons,
        // Read from the store, not a render's closure: `overwriteStale` re-bases and saves in the
        // same tick. A draft always carries its base version; `saved.version` only types the gap.
        version: useTeamSettingsStore.getState().baseVersion ?? saved.version,
      });
      clearDraft();
      setIsStale(false);
      toastSuccess("Đã lưu tên, màu và biểu tượng đội.");
    } catch (error) {
      const isStaleSave =
        error instanceof ApiError && error.statusCode === STALE_STATUS;
      // Any other outcome ends the conflict: leaving the flag on would keep a modal over the
      // toolbar's error message.
      setIsStale(isStaleSave);
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
    names: shown.names,
    colors: shown.colors,
    icons: shown.icons,
    dirty,
    changeCount,
    saving: saveMutation.isPending,
    saveErrorMessage:
      saveMutation.error instanceof ApiError &&
      saveMutation.error.statusCode !== STALE_STATUS
        ? saveMutation.error.message
        : undefined,
    setName: (team, name) => setNameInStore(saved, team, name),
    setColor: (team, color) => setColorInStore(saved, team, color),
    setIcon: (team, icon) => setIconInStore(saved, team, icon),
    reset: clearDraft,
    save,
    isStale,
    discardStale,
    overwriteStale,
    dismissStale: () => setIsStale(false),
  };
}
