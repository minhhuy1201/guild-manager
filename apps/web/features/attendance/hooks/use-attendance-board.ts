"use client";

import { combineQueries } from "@/lib/query-group";
import {
  useAttendanceRecords,
  useBattleSessions,
  useCharacters,
  useCurrentWeek,
} from "./use-attendance";

/** Shown when a query fails with something other than an `ApiError`. */
const FALLBACK_ERROR_MESSAGE = "Không tải được dữ liệu điểm danh.";

/** Combined loading/error state of every query the attendance screens depend on. */
export interface AttendanceBoardState {
  /** True while any of the queries has not resolved yet. */
  isPending: boolean;
  /** True as soon as one query fails. */
  isError: boolean;
  /** Message of the first failing query — empty string when there is no error. */
  errorMessage: string;
  /** Refetches every query at once. */
  refetch: () => void;
}

/**
 * Aggregates the four attendance queries (characters, sessions, records, week)
 * into a single loading/error state, so both the attendance screen and the
 * history screen branch on the same values instead of duplicating the logic.
 * @returns Combined pending/error state plus a refetch-all callback
 */
export function useAttendanceBoard(): AttendanceBoardState {
  const characters = useCharacters();
  const sessions = useBattleSessions();
  const records = useAttendanceRecords();
  const week = useCurrentWeek();

  return combineQueries(
    [characters, sessions, records, week],
    FALLBACK_ERROR_MESSAGE
  );
}
