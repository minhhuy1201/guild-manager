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
 * Draft state of the team settings (Zustand).
 * Holds ONLY unsaved edits - the saved settings are server data and stay in
 * TanStack Query, like every other response in this app.
 */
export const useTeamSettingsStore = create<TeamSettingsStoreState>((set) => ({
  draft: null,
  baseVersion: null,
  setName: (saved, team, name) =>
    set((state) => {
      const base = state.draft ?? saved;
      const trimmed = name.trim();
      const names = { ...base.names };

      // A cleared name is a missing key, not an empty string: that is what the
      // schema accepts and what makes the header fall back to the team number.
      if (trimmed) names[String(team)] = trimmed;
      else delete names[String(team)];

      return {
        draft: { names, colors: base.colors, icons: base.icons },
        baseVersion: state.baseVersion ?? saved.version,
      };
    }),
  setColor: (saved, team, color) =>
    set((state) => {
      const base = state.draft ?? saved;
      const colors = { ...base.colors };

      // The default colour is a missing key too, so the colour record keeps the rule the names follow.
      if (color) colors[String(team)] = color;
      else delete colors[String(team)];

      return {
        draft: { names: base.names, colors, icons: base.icons },
        baseVersion: state.baseVersion ?? saved.version,
      };
    }),
  setIcon: (saved, team, icon) =>
    set((state) => {
      const base = state.draft ?? saved;
      const icons = { ...base.icons };

      // No icon is a missing key too: the team keeps its colour dot.
      if (icon) icons[String(team)] = icon;
      else delete icons[String(team)];

      return {
        draft: { names: base.names, colors: base.colors, icons },
        baseVersion: state.baseVersion ?? saved.version,
      };
    }),
  rebase: (version) => set({ baseVersion: version }),
  clearDraft: () => set({ draft: null, baseVersion: null }),
}));
