"use client";

import { useQuery } from "@tanstack/react-query";

import {
  fetchSettingsWeeks,
  fetchWeekSessions,
} from "../api/battle-sessions-api";
import { settingsKeys } from "../api/battle-sessions-keys";

/**
 * Query các tuần thiết lập được (tuần đang mở + tuần kế tiếp).
 * @returns Kết quả query TanStack (data là mảng 2 tuần)
 */
export function useSettingsWeeks() {
  return useQuery({
    queryKey: settingsKeys.weeks(),
    queryFn: fetchSettingsWeeks,
  });
}

/**
 * Query các trận của một tuần.
 * @param weekStart - Mốc Thứ 2 của tuần; bỏ trống thì query không chạy
 * @returns Kết quả query TanStack (data là mảng trận)
 */
export function useWeekSessions(weekStart: string | null) {
  return useQuery({
    queryKey: settingsKeys.sessions(weekStart ?? ""),
    queryFn: () => fetchWeekSessions(weekStart as string),
    enabled: weekStart !== null,
  });
}
