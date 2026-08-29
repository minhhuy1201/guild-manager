/**
 * Query key factory for the team builder domain.
 * Split out of `team-builder-api.ts` because a `"use server"` file may only export async functions.
 */
export const teamBuilderKeys = {
  all: ["team-builder"] as const,
  weeks: () => [...teamBuilderKeys.all, "weeks"] as const,
  formations: (weekStart?: string) =>
    [...teamBuilderKeys.all, "formations", weekStart ?? "current"] as const,
  teamNames: () => [...teamBuilderKeys.all, "team-names"] as const,
};
