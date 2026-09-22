"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchTactic } from "../api/tactics-api";
import { tacticKeys } from "../api/tactics-keys";

/**
 * One tactic with its whole scene — the server copy the editor starts its draft from.
 *
 * Read again on every open, cache or not: the draft is taken from this read exactly once, and a copy
 * another admin has saved over since would be saved back over their work.
 * @param id - Tactic id
 * @returns TanStack query holding the tactic
 */
export function useTactic(id: string) {
  return useQuery({
    queryKey: tacticKeys.detail(id),
    queryFn: () => fetchTactic(id),
    refetchOnMount: "always",
  });
}
