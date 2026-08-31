"use client";

import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { BattleSession, Character } from "@guild/shared/schemas";

import { useInvalidate } from "@/hooks/use-invalidate";
import { matchesRosterFilter } from "@/lib/roster-filter";
import { attendanceKeys } from "../api/attendance-keys";
import {
  fetchAttendanceRecords,
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

interface SessionFilter {
  /** The week's sessions, empty while the query has no data. */
  sessions: BattleSession[];
  /** The session being filtered on, null when every session is shown. */
  selectedSession: BattleSession | null;
  setSessionId: (value: string | null) => void;
}

/**
 * The History screen's session filter, resolved against the sessions actually loaded.
 * A stored id matching no session — the admin deleted it while the filter was set — resolves to
 * null, so the picker and the table agree on "every session" instead of one showing "Tất cả" and the
 * other showing nothing.
 * @returns The week's sessions, the resolved selection and its setter
 */
export function useSessionFilter(): SessionFilter {
  const { data: sessions } = useBattleSessions();
  const sessionId = useAttendanceFilterStore((s) => s.sessionId);
  const setSessionId = useAttendanceFilterStore((s) => s.setSessionId);

  const list = sessions ?? [];
  return {
    sessions: list,
    selectedSession: list.find((session) => session.id === sessionId) ?? null,
    setSessionId,
  };
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
