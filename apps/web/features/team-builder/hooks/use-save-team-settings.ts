"use client";

import { useMutation } from "@tanstack/react-query";
import { fromAction } from "@/lib/action-result";

import { useInvalidate } from "@/hooks/use-invalidate";
import { saveTeamSettings } from "../api/team-builder-api";

/**
 * Persist the whole team settings bundle (names, colours and icons).
 * No optimistic update, for the same reason `useSaveFormation` has none: a
 * failed save must leave the draft intact so the user can retry.
 * @returns TanStack mutation; use mutateAsync to catch backend errors
 */
export function useSaveTeamSettings() {
  const invalidate = useInvalidate("formation");

  return useMutation({
    mutationFn: fromAction(saveTeamSettings),
    onSuccess: invalidate,
  });
}
