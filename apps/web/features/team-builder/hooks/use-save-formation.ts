"use client";

import { useMutation } from "@tanstack/react-query";

import { useInvalidate } from "@/hooks/use-invalidate";
import { saveFormation } from "../api/team-builder-api";

/**
 * Persist one session's formation.
 * No optimistic update on purpose: a failed save must leave the draft intact,
 * since losing the arrangement is far worse than waiting a beat for the server.
 * @returns TanStack mutation; use mutateAsync to catch backend errors
 */
export function useSaveFormation() {
  const invalidate = useInvalidate("formation");

  return useMutation({
    mutationFn: saveFormation,
    onSuccess: invalidate,
  });
}
