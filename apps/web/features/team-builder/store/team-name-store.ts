import { create } from "zustand";

import type { TeamNames } from "@guild/shared/schemas";

interface TeamNameState {
  /**
   * Unsaved team names. `null` means nothing was typed yet and the saved copy
   * shows through — the same "missing key = untouched" rule `formation-store`
   * uses for its per-day drafts, except there is only ever one draft here
   * because the names are global.
   */
  draft: TeamNames | null;
  /** Write one team's name into the draft, starting it from `saved` when there is none */
  setName: (saved: TeamNames, team: number, name: string) => void;
  /** Discard the draft, falling back to the saved copy */
  clearDraft: () => void;
}

/**
 * Draft state of the team names (Zustand).
 * Holds ONLY unsaved edits — the saved names are server data and stay in
 * TanStack Query, like every other response in this app.
 */
export const useTeamNameStore = create<TeamNameState>((set) => ({
  draft: null,
  setName: (saved, team, name) =>
    set((state) => {
      const base = state.draft ?? saved;
      const trimmed = name.trim();
      const next = { ...base };

      // A cleared name is a missing key, not an empty string: that is what the
      // schema accepts and what makes the header fall back to the team number.
      if (trimmed) next[String(team)] = trimmed;
      else delete next[String(team)];

      return { draft: next };
    }),
  clearDraft: () => set({ draft: null }),
}));
