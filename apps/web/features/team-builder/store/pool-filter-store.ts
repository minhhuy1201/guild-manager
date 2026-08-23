import { create } from "zustand";
import type { GuildClass } from "@guild/shared/enums";

import type { RosterFilter } from "@/lib/roster-filter";

interface PoolFilterState {
  /** Search keyword over character name */
  search: string;
  /** Guild classes being filtered. An empty array means every class. */
  guildClasses: GuildClass[];
  setFilter: (value: RosterFilter) => void;
}

/**
 * Pool filter state for the formation builder (Zustand).
 * One screen only, so unlike the attendance filter store it needs no scoping.
 */
export const usePoolFilterStore = create<PoolFilterState>((set) => ({
  search: "",
  guildClasses: [],
  setFilter: (value) =>
    set({ search: value.search, guildClasses: value.guildClasses }),
}));
