"use client";

import { useQuery } from "@tanstack/react-query";

import {
  fetchSettingsWeeks,
  fetchWeekSessions,
} from "../api/battle-sessions-api";
import { settingsKeys } from "../api/battle-sessions-keys";

/**
 * Query the schedulable weeks (the open week + the next one).
 * @returns The TanStack query result (data is the two weeks)
 */
export function useSettingsWeeks() {
  return useQuery({
    queryKey: settingsKeys.weeks(),
    queryFn: fetchSettingsWeeks,
  });
}

/**
 * Query one week's sessions.
 * @param weekStart - Monday marker of the week; omitted disables the query
 * @returns The TanStack query result (data is the session list)
 */
export function useWeekSessions(weekStart: string | null) {
  return useQuery({
    queryKey: settingsKeys.sessions(weekStart ?? ""),
    queryFn: () => fetchWeekSessions(weekStart as string),
    enabled: weekStart !== null,
  });
}
