"use client";

import { RosterFilterBar } from "@/components/shared/roster-filter-bar";
import { usePoolFilterStore } from "../store/pool-filter-store";

/**
 * Search box and guild class picker narrowing the member pool.
 * Reads and writes the pool filter store directly.
 * @returns Filter row for the member pool
 */
export function PoolFilters() {
  const search = usePoolFilterStore((state) => state.search);
  const guildClasses = usePoolFilterStore((state) => state.guildClasses);
  const setFilter = usePoolFilterStore((state) => state.setFilter);

  return (
    <RosterFilterBar
      idPrefix="pool"
      value={{ search, guildClasses }}
      onChange={setFilter}
    />
  );
}
