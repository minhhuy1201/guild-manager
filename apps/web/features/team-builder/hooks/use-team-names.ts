"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchTeamNames } from "../api/team-builder-api";
import { teamBuilderKeys } from "../api/team-builder-keys";

/**
 * Saved names of the formation's team columns.
 * Global data — it carries no week and no session, so the key takes no argument.
 * @returns TanStack query holding team number (as a decimal string) → name
 */
export function useTeamNames() {
  return useQuery({
    queryKey: teamBuilderKeys.teamNames(),
    queryFn: fetchTeamNames,
  });
}
