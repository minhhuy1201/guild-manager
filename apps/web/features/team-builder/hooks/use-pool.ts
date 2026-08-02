"use client";

import { useMemo } from "react";

import { selectPoolCharacters, type PoolCandidate } from "../lib/pool";
import { useFormationStore } from "../store/formation-store";
import { usePoolFilterStore } from "../store/pool-filter-store";

/**
 * React wrapper over `selectPoolCharacters`. Reads the assignment and the
 * filters from their stores, keeps the result memoised. All the actual
 * filtering lives in the pure function so it stays unit-testable.
 * @param characters - Full guild roster from the server
 * @returns Characters still available to place, already filtered
 */
export function usePool<T extends PoolCandidate>(characters: T[]): T[] {
  const assignment = useFormationStore((state) => state.assignment);
  const search = usePoolFilterStore((state) => state.search);
  const guildClasses = usePoolFilterStore((state) => state.guildClasses);

  return useMemo(
    () => selectPoolCharacters(characters, assignment, { search, guildClasses }),
    [characters, assignment, search, guildClasses]
  );
}
