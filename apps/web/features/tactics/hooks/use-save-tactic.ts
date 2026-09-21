"use client";

import { useMutation } from "@tanstack/react-query";

import { useInvalidate } from "@/hooks/use-invalidate";
import { saveTacticStages } from "../api/tactics-api";

/**
 * Persist the whole scene of one tactic.
 * No optimistic update on purpose: a failed save must leave the draft on screen, since losing a
 * drawing is far worse than waiting a beat for the server.
 * @returns TanStack mutation; use mutateAsync to catch backend errors
 */
export function useSaveTactic() {
  const invalidate = useInvalidate("tactic");

  return useMutation({ mutationFn: saveTacticStages, onSuccess: invalidate });
}
