"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchFormationWeeks } from "../api/team-builder-api";
import { teamBuilderKeys } from "../api/team-builder-keys";

/**
 * Weeks that still hold formation data, newest first.
 * @returns TanStack query holding the week list
 */
export function useFormationWeeks() {
  return useQuery({
    queryKey: teamBuilderKeys.weeks(),
    queryFn: () => fetchFormationWeeks(),
  });
}
