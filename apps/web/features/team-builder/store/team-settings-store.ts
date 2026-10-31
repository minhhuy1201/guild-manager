import { create } from "zustand";

import type { TeamColor, TeamIcon } from "@guild/shared/enums";
import type { TeamSettings, TeamSettingsState } from "@guild/shared/schemas";

interface TeamSettingsStoreState {
  /**
   * Unsaved team settings (names, colours and icons). `null` means nothing was edited yet and the saved
   * copy shows through - the same "missing key = untouched" rule `formation-store` uses for its
   * per-day drafts, except there is only ever one draft here because the settings are global.
   */
  draft: TeamSettings | null;
  /**
   * The saved version the draft started from; null while there is no draft. Captured with the draft
   * and never re-read at save time, for the same reason `formation-store` keeps `baseVersions`.
   */
  baseVersion: number | null;
  /** Write one team's name into the draft, starting it from `saved` when there is none */
  setName: (saved: TeamSettingsState, team: number, name: string) => void;
  /** Write one team's colour into the draft; `null` puts the team back on its default colour */
  setColor: (
    saved: TeamSettingsState,
    team: number,
    color: TeamColor | null
  ) => void;
  /** Write one team's icon into the draft; `null` puts the team back on its colour dot */
  setIcon: (
    saved: TeamSettingsState,
    team: number,
    icon: TeamIcon | null
  ) => void;
  /** Re-base the draft onto a newer saved version, keeping the draft itself */
  rebase: (version: number) => void;
  /** Discard the draft and its base version, falling back to the saved copy */
  clearDraft: () => void;
}

/**
 * A copy of `record` with the team's key set to `value`, or removed when `value` is null. Every
 * per-team record follows the same "no value = no key" rule the schema accepts.
 */
function withKey<T>(
  record: Record<string, T>,
  team: number,
  value: T | null
): Record<string, T> {
  const key = String(team);
  const rest = Object.fromEntries(
    Object.entries(record).filter(([entryKey]) => entryKey !== key)
  );

  return value === null ? rest : { ...rest, [key]: value };
}

/**
 * Draft state of the team settings (Zustand).
 * Holds ONLY unsaved edits - the saved settings are server data and stay in
 * TanStack Query, like every other response in this app.
 */
export const useTeamSettingsStore = create<TeamSettingsStoreState>((set) => {
  /** Apply one field change to the draft, starting it from `saved` when there is none. */
  function patch(
    saved: TeamSettingsState,
    change: (base: TeamSettings) => Partial<TeamSettings>
  ) {
    set((state) => {
      const base = state.draft ?? saved;

      return {
        draft: {
          names: base.names,
          colors: base.colors,
          icons: base.icons,
          ...change(base),
        },
        baseVersion: state.baseVersion ?? saved.version,
      };
    });
  }

  return {
    draft: null,
    baseVersion: null,
    // A cleared name is a missing key, not an empty string: that is what makes the header fall back
    // to the team number.
    setName: (saved, team, name) =>
      patch(saved, (base) => ({
        names: withKey(base.names, team, name.trim() || null),
      })),
    setColor: (saved, team, color) =>
      patch(saved, (base) => ({ colors: withKey(base.colors, team, color) })),
    setIcon: (saved, team, icon) =>
      patch(saved, (base) => ({ icons: withKey(base.icons, team, icon) })),
    rebase: (version) => set({ baseVersion: version }),
    clearDraft: () => set({ draft: null, baseVersion: null }),
  };
});
