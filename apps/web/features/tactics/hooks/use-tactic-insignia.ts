"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { fromAction } from "@/lib/action-result";

import { useInvalidate } from "@/hooks/use-invalidate";
import {
  fetchTacticInsignia,
  renameTacticInsignia,
  resetTacticInsignia,
} from "../api/tactics-api";
import { tacticKeys } from "../api/tactics-keys";

/**
 * The seven Insignia in display order, each under the name the guild currently gives it.
 * @returns TanStack query holding the Insignia; `data` is undefined while loading
 */
export function useTacticInsignia() {
  return useQuery({
    queryKey: tacticKeys.insignia(),
    queryFn: fromAction(fetchTacticInsignia),
  });
}

/**
 * Give an Insignia the guild's own name; a name equal to the default restores it.
 * @returns TanStack mutation; use mutateAsync to catch backend errors
 */
export function useRenameTacticInsignia() {
  const invalidate = useInvalidate("tactic");

  return useMutation({ mutationFn: fromAction(renameTacticInsignia), onSuccess: invalidate });
}

/**
 * Restore an Insignia's default name.
 * @returns TanStack mutation; use mutateAsync to catch backend errors
 */
export function useResetTacticInsignia() {
  const invalidate = useInvalidate("tactic");

  return useMutation({ mutationFn: fromAction(resetTacticInsignia), onSuccess: invalidate });
}
