"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { attendanceKeys } from "../api/attendance-api";
import type { BattleSession } from "../types/attendance";

/**
 * Schedules a refresh exactly when the next attendance deadline passes, so the
 * grid locks its columns without the user reloading the page.
 * Deadlines are evaluated at render time from cached data, so without this the
 * UI keeps offering a column the server has already closed.
 * @param sessions - Sessions of the open week (empty array while loading)
 * @returns Nothing — the hook only schedules a cache invalidation
 */
export function useDeadlineRefresh(sessions: BattleSession[]): void {
  const queryClient = useQueryClient();
  const nextDeadline = findNextDeadline(sessions);

  useEffect(() => {
    if (nextDeadline === null) return;

    const timer = setTimeout(() => {
      void queryClient.invalidateQueries({
        queryKey: attendanceKeys.sessions(),
      });
      void queryClient.invalidateQueries({
        queryKey: attendanceKeys.records(),
      });
    }, nextDeadline - Date.now());

    return () => clearTimeout(timer);
  }, [nextDeadline, queryClient]);
}

/**
 * Finds the soonest deadline that is still in the future.
 * @param sessions - Sessions of the open week
 * @returns Timestamp in milliseconds, or null when every deadline has passed
 */
function findNextDeadline(sessions: BattleSession[]): number | null {
  const now = Date.now();
  const upcoming = sessions
    .map((session) => new Date(session.deadline).getTime())
    .filter((deadline) => deadline > now);

  return upcoming.length === 0 ? null : Math.min(...upcoming);
}
