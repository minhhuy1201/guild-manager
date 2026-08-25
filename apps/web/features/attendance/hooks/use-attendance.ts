"use client";

import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Character } from "@guild/shared/schemas";

import { useInvalidate } from "@/hooks/use-invalidate";
import { matchesRosterFilter } from "@/lib/roster-filter";
import { attendanceKeys } from "../api/attendance-keys";
import {
  fetchAttendanceRecords,
  fetchAttendanceSummary,
  fetchBattleSessions,
  fetchCharacters,
  fetchCurrentWeek,
  markAttendance,
} from "../api/attendance-api";
import {
  useAttendanceFilterStore,
  type AttendanceFilterScope,
} from "../store/attendance-filter-store";

/**
 * Query the guild's characters.
 * @returns The TanStack query result (data is the character list)
 */
export function useCharacters() {
  return useQuery({
    queryKey: attendanceKeys.characters(),
    queryFn: fetchCharacters,
  });
}

/**
 * Query the week's battle sessions.
 * @returns The TanStack query result (data is the session list)
 */
export function useBattleSessions() {
  return useQuery({
    queryKey: attendanceKeys.sessions(),
    queryFn: fetchBattleSessions,
  });
}

/**
 * Query the current attendance week.
 * @returns The TanStack query result (data is the current week)
 */
export function useCurrentWeek() {
  return useQuery({
    queryKey: attendanceKeys.week(),
    queryFn: fetchCurrentWeek,
  });
}

/**
 * Query every attendance record.
 * @returns The TanStack query result (data is a map of records by key)
 */
export function useAttendanceRecords() {
  return useQuery({
    queryKey: attendanceKeys.records(),
    queryFn: fetchAttendanceRecords,
  });
}

/**
 * The characters matching one screen's filters (search + class).
 * Name matching is case-insensitive.
 * @param scope - Screen whose filters are read; each screen has its own filter state
 * @returns Matching characters (empty while the query has no data)
 */
export function useFilteredCharacters(
  scope: AttendanceFilterScope
): Character[] {
  const { data: characters } = useCharacters();
  const filter = useAttendanceFilterStore((s) => s.filters[scope]);

  return useMemo(
    () =>
      (characters ?? []).filter((character) =>
        matchesRosterFilter(character, filter)
      ),
    [characters, filter]
  );
}

/**
 * Query the sign-up counts per session — used by the member screen, where other people's rows are
 * not visible.
 * @returns The TanStack query result (data is the tallies per session)
 */
export function useAttendanceSummary() {
  return useQuery({
    queryKey: attendanceKeys.summary(),
    queryFn: fetchAttendanceSummary,
  });
}

/**
 * The attendance mutation; on success it invalidates the record list.
 * @returns The TanStack mutation (use mutateAsync to catch validation errors)
 */
export function useMarkAttendance() {
  const invalidate = useInvalidate("attendance");

  return useMutation({
    mutationFn: markAttendance,
    onSuccess: invalidate,
  });
}
