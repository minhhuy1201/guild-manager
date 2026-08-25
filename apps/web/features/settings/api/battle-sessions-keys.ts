/**
 * Query key factory for the schedule settings screen.
 * Split out of `battle-sessions-api.ts` because a `"use server"` file may only export async functions.
 */
export const settingsKeys = {
  all: ["settings"] as const,
  weeks: () => [...settingsKeys.all, "weeks"] as const,
  sessions: (weekStart: string) =>
    [...settingsKeys.all, "sessions", weekStart] as const,
};
