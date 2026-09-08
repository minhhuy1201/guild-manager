"use client";

import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { BattleSession, Character } from "@guild/shared/schemas";

import { useInvalidate } from "@/hooks/use-invalidate";
import { matchesRosterFilter } from "@/lib/roster-filter";
import { attendanceKeys } from "../api/attendance-keys";
import {
  historyWeekOptions,
  type HistoryWeekOption,
} from "../lib/history-weeks";
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
 * Query one week's battle sessions.
 * @param weekStart - Monday 00:00 of the week (ISO); null, the default, is the open week
 * @returns The TanStack query result (data is the session list)
 */
export function useBattleSessions(weekStart: string | null = null) {
  return useQuery({
    queryKey: attendanceKeys.sessionsOf(weekStart),
    queryFn: () => fetchBattleSessions(weekStart),
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
 * Query one week's attendance records.
 * @param weekStart - Monday 00:00 of the week (ISO); null, the default, is the open week
 * @returns The TanStack query result (data is a map of records by key)
 */
export function useAttendanceRecords(weekStart: string | null = null) {
  return useQuery({
    queryKey: attendanceKeys.recordsOf(weekStart),
    queryFn: () => fetchAttendanceRecords(weekStart),
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

/** The History screen's week picker, resolved against the weeks actually on offer. */
export interface HistoryWeek {
  /** Weeks the picker lists, the open one first. */
  options: HistoryWeekOption[];
  /** The chosen week, null while the open one is selected. */
  selected: HistoryWeekOption | null;
  /** What the queries key on and send: null is the open week. */
  weekStart: string | null;
  setWeekStart: (value: string | null) => void;
}

/**
 * The History screen's week selection.
 *
 * A stored week that is no longer on offer resolves to null - the open week - the same way
 * `useSessionFilter` resolves a deleted session, so the picker and the table never disagree.
 * @returns The week options, the resolved selection and its setter
 */
export function useHistoryWeek(): HistoryWeek {
  const { data: current } = useCurrentWeek();
  const weekStart = useAttendanceFilterStore((s) => s.weekStart);
  const setWeekStart = useAttendanceFilterStore((s) => s.setWeekStart);

  const options = useMemo(
    () => (current ? historyWeekOptions(current.weekStart) : []),
    [current]
  );
  const selected =
    options.find((option) => option.weekStart === weekStart) ?? null;

  return {
    options,
    selected,
    // The open week is sent as "no week": that is what keeps its cache entry shared with the
    // Attendance screen, which reads the same data without ever choosing a week.
    weekStart: selected?.isCurrent ? null : (selected?.weekStart ?? null),
    setWeekStart,
  };
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
 *
 * The week is a parameter rather than read from `useHistoryWeek` in here: every caller already holds
 * it, and reaching for it internally made components that need both run the week hook twice.
 *
 * @param weekStart - Week whose sessions to offer (ISO); null, the default, is the open week
 * @returns The week's sessions, the resolved selection and its setter
 */
export function useSessionFilter(
  weekStart: string | null = null
): SessionFilter {
  const { data: sessions } = useBattleSessions(weekStart);
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
