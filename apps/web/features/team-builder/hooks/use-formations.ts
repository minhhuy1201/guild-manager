"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchFormations } from "../api/team-builder-api";
import { teamBuilderKeys } from "../api/team-builder-keys";

/**
 * Saved formations for every battle of one week.
 * This is the server copy — user edits live as drafts in the Zustand store.
 * @param weekStart - Monday of the week to read; omit for the open week
 * @returns TanStack query holding the week's sessions and their formations
 */
export function useFormations(weekStart?: string) {
  return useQuery({
    queryKey: teamBuilderKeys.formations(weekStart),
    queryFn: () => fetchFormations(weekStart),
  });
}
