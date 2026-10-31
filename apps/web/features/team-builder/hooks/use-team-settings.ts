"use client";

import { useQuery } from "@tanstack/react-query";
import { fromAction } from "@/lib/action-result";

import { fetchTeamSettings } from "../api/team-builder-api";
import { teamBuilderKeys } from "../api/team-builder-keys";

/**
 * Saved names, colours and icons of the formation's team columns.
 * Global data — it carries no week and no session, so the key takes no argument.
 * @returns TanStack query holding the names, colours and icons (team number as a decimal string → value) and the version
 */
export function useTeamSettings() {
  return useQuery({
    queryKey: teamBuilderKeys.teamSettings(),
    queryFn: fromAction(fetchTeamSettings),
  });
}
