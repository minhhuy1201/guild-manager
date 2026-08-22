"use client";

import { useMemo } from "react";
import type { Character, FormationWeek, SessionFormation } from "@guild/shared/schemas";

import { useAttendanceRecords, useCharacters } from "@/features/attendance";
import { combineQueries } from "@/lib/query-group";
import type { AttendanceRecordLike } from "../lib/session-pool";
import { findActiveWeekStart, isWeekEditable } from "../lib/week-status";
import { useFormationStore } from "../store/formation-store";
import { useFormations } from "./use-formations";
import { useFormationWeeks } from "./use-formation-weeks";

/** The week branch of the formation screen: which week, and the data it loads. */
export interface FormationWeekState {
  /** Weeks that still hold formation data, newest first */
  weeks: FormationWeek[];
  /** Monday of the week on screen; "" while the week list is still loading */
  weekStart: string;
  /** Whether the week on screen still accepts edits at all */
  isEditableWeek: boolean;
  /** Switch to another week; drafts of the previous week are dropped */
  setWeek: (weekStart: string | null) => void;
  /** True while any of the three source queries is still loading */
  isPending: boolean;
  /** True when any of the three source queries failed */
  isError: boolean;
  /** Message of the first failing query — empty string when there is no error */
  errorMessage: string;
  /** Reload all three source queries at once */
  refetch: () => void;
  /** Battles of the week on screen, ordered by battle time */
  sessions: SessionFormation[];
  /** Full guild roster */
  characters: Character[];
  /** Attendance records of the week, flattened out of the query's keyed map */
  records: AttendanceRecordLike[];
  /** Reload only the formations — used when a save hits a locked battle */
  refetchFormations: () => void;
}

/**
 * Which week the screen is showing, plus the three queries that hang off it.
 * This is the root of the screen's one-way data flow: everything downstream
 * reads `sessions`, `characters` and `records` from here instead of querying
 * again, which is also why the loading and error state lives on this hook.
 * @returns The week on screen, its loading state, and the data it pulled in
 */
export function useFormationWeek(): FormationWeekState {
  const weeksQuery = useFormationWeeks();
  const selectedWeekStart = useFormationStore((s) => s.selectedWeekStart);
  const setWeek = useFormationStore((s) => s.setWeek);

  const activeWeekStart = findActiveWeekStart(weeksQuery.data ?? []);
  const weekStart = selectedWeekStart ?? activeWeekStart ?? undefined;
  const isEditableWeek = isWeekEditable(weekStart, activeWeekStart);

  const formationsQuery = useFormations(weekStart);
  const charactersQuery = useCharacters();
  const recordsQuery = useAttendanceRecords();

  const sessions = useMemo(
    () => formationsQuery.data ?? [],
    [formationsQuery.data]
  );
  const characters = useMemo(
    () => charactersQuery.data ?? [],
    [charactersQuery.data]
  );
  // useAttendanceRecords keys its records by characterId__sessionId; the pure
  // helpers downstream work on a flat list.
  const records = useMemo(
    () => Object.values(recordsQuery.data ?? {}),
    [recordsQuery.data]
  );

  // recordsQuery stays out of the group: attendance only tints suggestions in the
  // pool, so the screen works without it and it may not block it with a skeleton.
  const state = combineQueries(
    // formationsQuery goes first: losing it loses what this screen exists to show.
    [formationsQuery, weeksQuery, charactersQuery],
    "Không tải được dữ liệu đội hình."
  );

  return {
    weeks: weeksQuery.data ?? [],
    weekStart: weekStart ?? "",
    isEditableWeek,
    setWeek,
    isPending: state.isPending,
    isError: state.isError,
    errorMessage: state.errorMessage,
    refetch: state.refetch,
    sessions,
    characters,
    records,
    refetchFormations: () => {
      void formationsQuery.refetch();
    },
  };
}
