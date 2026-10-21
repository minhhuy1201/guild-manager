"use client";

import { useQuery } from "@tanstack/react-query";
import { fromAction } from "@/lib/action-result";

import { fetchTactics } from "../api/tactics-api";
import { tacticKeys } from "../api/tactics-keys";

/**
 * Every saved tactic, newest edit first.
 * @returns TanStack query holding the tactic summaries
 */
export function useTactics() {
  return useQuery({
    queryKey: tacticKeys.list(),
    queryFn: fromAction(fetchTactics),
  });
}
