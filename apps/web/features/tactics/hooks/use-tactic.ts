"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchTactic } from "../api/tactics-api";
import { tacticKeys } from "../api/tactics-keys";

/**
 * One tactic with its whole scene — the server copy the editor starts its draft from.
 * @param id - Tactic id
 * @returns TanStack query holding the tactic
 */
export function useTactic(id: string) {
  return useQuery({
    queryKey: tacticKeys.detail(id),
    queryFn: () => fetchTactic(id),
  });
}
