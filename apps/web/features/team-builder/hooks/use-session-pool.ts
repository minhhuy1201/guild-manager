"use client";

import { useMemo } from "react";

import { selectPoolCharacters, type PoolCandidate } from "../lib/pool";
import {
  presentCharacterIds,
  selectPresentCharacters,
  type AttendanceRecordLike,
} from "../lib/session-pool";
import { usePoolFilterStore } from "../store/pool-filter-store";
import type { Assignment } from "../types/formation";

/**
 * Pool for one battle: whoever marked present for it, minus whoever is already
 * placed, then narrowed by the search and class filters.
 * Nothing is stored — this recomputes on render, so the pool cannot drift.
 * @param characters - Full guild roster from the server
 * @param records - Attendance records of the open week
 * @param sessionId - Battle being arranged
 * @param assignment - Assignment currently shown for that battle
 * @returns Characters still available to place, already filtered
 */
export function useSessionPool<T extends PoolCandidate>(
  characters: T[],
  records: AttendanceRecordLike[],
  sessionId: string,
  assignment: Assignment
): T[] {
  const search = usePoolFilterStore((state) => state.search);
  const guildClasses = usePoolFilterStore((state) => state.guildClasses);

  return useMemo(() => {
    const present = selectPresentCharacters(
      characters,
      presentCharacterIds(records, sessionId)
    );

    return selectPoolCharacters(present, assignment, { search, guildClasses });
  }, [characters, records, sessionId, assignment, search, guildClasses]);
}
