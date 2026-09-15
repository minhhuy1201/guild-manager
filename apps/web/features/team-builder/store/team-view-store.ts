import { create } from "zustand";

interface TeamViewState {
  /** Team shown below `md`, where the grid holds one team at a time */
  selectedTeam: number;
  /** Show another team */
  selectTeam: (team: number) => void;
}

/**
 * The team a phone shows, one at a time (Zustand). Kept apart from `formation-store` on purpose: that
 * store holds the draft and its undo steps, and picking a team to look at is not an edit - it must
 * never become a step Ctrl+Z or the Undo button takes back. Kept across day and match switches, so
 * an admin checking team 3 stays on team 3.
 */
export const useTeamViewStore = create<TeamViewState>((set) => ({
  selectedTeam: 1,
  selectTeam: (team) => set({ selectedTeam: team }),
}));
