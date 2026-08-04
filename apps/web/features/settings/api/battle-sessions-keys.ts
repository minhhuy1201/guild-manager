/**
 * Query key factory cho màn Thiết lập lịch đánh.
 * Tách khỏi `battle-sessions-api.ts` vì file `"use server"` chỉ được export hàm async.
 */
export const settingsKeys = {
  all: ["settings"] as const,
  weeks: () => [...settingsKeys.all, "weeks"] as const,
  sessions: (weekStart: string) =>
    [...settingsKeys.all, "sessions", weekStart] as const,
};
