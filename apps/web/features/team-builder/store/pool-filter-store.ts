import { create } from "zustand";
import type { GuildClass } from "@guild/shared/enums";

interface PoolFilterState {
  /** Search keyword over character name and in-game id */
  search: string;
  /** Guild classes being filtered. An empty array means every class. */
  guildClasses: GuildClass[];
  setSearch: (value: string) => void;
  setGuildClasses: (value: GuildClass[]) => void;
}

/**
 * Pool filter state for the formation builder (Zustand).
 * One screen only, so unlike the attendance filter store it needs no scoping.
 */
export const usePoolFilterStore = create<PoolFilterState>((set) => ({
  search: "",
  guildClasses: [],
  setSearch: (value) => set({ search: value }),
  setGuildClasses: (value) => set({ guildClasses: value }),
}));
