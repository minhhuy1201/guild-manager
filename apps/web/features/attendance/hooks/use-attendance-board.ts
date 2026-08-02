"use client";

import { ApiError } from "@/lib/api-client";
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

  const queries = [characters, sessions, records, week];
  const firstError = queries.find((query) => query.isError)?.error ?? null;

  return {
    isPending: queries.some((query) => query.isPending),
    isError: firstError !== null,
    errorMessage: readErrorMessage(firstError),
    // Refetch tất cả cùng lúc — không await tuần tự từng query.
    refetch: () => {
      void Promise.all(queries.map((query) => query.refetch()));
    },
  };
}

/**
 * Reads a display message out of a failing query's error.
 * @param error - Error of the first failing query, or null when nothing failed
 * @returns Backend message for an `ApiError`, the fallback otherwise, "" when no error
 */
function readErrorMessage(error: unknown): string {
  if (error === null) return "";

  return error instanceof ApiError ? error.message : FALLBACK_ERROR_MESSAGE;
}
