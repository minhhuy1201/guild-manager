/**
 * Query key factory cho domain xếp đội hình.
 * Tách khỏi `team-builder-api.ts` vì file `"use server"` chỉ được export hàm async.
 */
export const teamBuilderKeys = {
  all: ["team-builder"] as const,
  weeks: () => [...teamBuilderKeys.all, "weeks"] as const,
  formations: (weekStart?: string) =>
    [...teamBuilderKeys.all, "formations", weekStart ?? "current"] as const,
};
