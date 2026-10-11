/**
 * Query key factory for the cat race domain.
 * Split out of `cat-race-api.ts` because a `"use server"` file may only export async functions.
 */
export const catRaceKeys = {
  all: ["cat-race"] as const,
  list: () => [...catRaceKeys.all, "list"] as const,
  prefill: () => [...catRaceKeys.all, "prefill"] as const,
  detail: (id: string) => [...catRaceKeys.all, "detail", id] as const,
};
