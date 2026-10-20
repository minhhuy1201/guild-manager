"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { fromAction } from "@/lib/action-result";

import { useInvalidate } from "@/hooks/use-invalidate";
import {
  createTokenPreset,
  deleteTokenPreset,
  fetchTokenPresets,
} from "../api/tactics-api";
import { tacticKeys } from "../api/tactics-keys";

/**
 * The palette's saved presets, in display order.
 * @returns TanStack query holding the presets
 */
export function useTokenPresets() {
  return useQuery({
    queryKey: tacticKeys.tokenPresets(),
    queryFn: fromAction(fetchTokenPresets),
  });
}

/**
 * Add a preset to the palette.
 * @returns TanStack mutation; use mutateAsync to catch backend errors
 */
export function useCreateTokenPreset() {
  const invalidate = useInvalidate("tactic");

  return useMutation({ mutationFn: fromAction(createTokenPreset), onSuccess: invalidate });
}

/**
 * Delete a preset. Tactics already drawn keep the tokens they captured.
 * @returns TanStack mutation; use mutateAsync to catch backend errors
 */
export function useDeleteTokenPreset() {
  const invalidate = useInvalidate("tactic");

  return useMutation({ mutationFn: fromAction(deleteTokenPreset), onSuccess: invalidate });
}
