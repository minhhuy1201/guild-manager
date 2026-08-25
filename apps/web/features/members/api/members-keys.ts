/**
 * Query key factory for the Members screen.
 * Split out of `members-api.ts` because a `"use server"` file may only export async functions.
 */
export const memberKeys = {
  all: ["members"] as const,
  list: () => [...memberKeys.all, "list"] as const,
};
