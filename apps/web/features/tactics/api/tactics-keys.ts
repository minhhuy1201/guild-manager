/**
 * Query key factory for the tactics domain.
 * Split out of `tactics-api.ts` because a `"use server"` file may only export async functions.
 */
export const tacticKeys = {
  all: ["tactics"] as const,
  list: () => [...tacticKeys.all, "list"] as const,
  detail: (id: string) => [...tacticKeys.all, "detail", id] as const,
  tokenPresets: () => [...tacticKeys.all, "token-presets"] as const,
};
