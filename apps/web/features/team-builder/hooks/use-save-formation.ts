"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { saveFormation } from "../api/team-builder-api";
import { teamBuilderKeys } from "../api/team-builder-keys";

/**
 * Persist one session's formation.
 * No optimistic update on purpose: a failed save must leave the draft intact,
 * since losing the arrangement is far worse than waiting a beat for the server.
 * @returns TanStack mutation; use mutateAsync to catch backend errors
 */
export function useSaveFormation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveFormation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamBuilderKeys.all });
    },
  });
}
