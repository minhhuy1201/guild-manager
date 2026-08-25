"use client";

import { useMutation } from "@tanstack/react-query";
import type {
  CreateBattleSessionInput,
  UpdateBattleSessionInput,
} from "@guild/shared/schemas";

import { useInvalidate } from "@/hooks/use-invalidate";
import {
  createBattleSession,
  deleteBattleSession,
  updateBattleSession,
} from "../api/battle-sessions-api";

/** Payload for editing a session. */
export interface UpdateSessionVariables {
  /** Id of the session to edit */
  id: string;
  /** Fields to change */
  input: UpdateBattleSessionInput;
}

/**
 * The create-scrim mutation.
 * @returns The TanStack mutation (use mutateAsync to catch backend errors)
 */
export function useCreateSession() {
  const invalidate = useInvalidate("schedule");

  return useMutation({
    mutationFn: (input: CreateBattleSessionInput) => createBattleSession(input),
    onSuccess: invalidate,
  });
}

/**
 * The edit-session mutation.
 * @returns The TanStack mutation (use mutateAsync to catch backend errors)
 */
export function useUpdateSession() {
  const invalidate = useInvalidate("schedule");

  return useMutation({
    mutationFn: ({ id, input }: UpdateSessionVariables) =>
      updateBattleSession(id, input),
    onSuccess: invalidate,
  });
}

/**
 * The delete-scrim mutation.
 * @returns The TanStack mutation (use mutateAsync to catch backend errors)
 */
export function useDeleteSession() {
  const invalidate = useInvalidate("schedule");

  return useMutation({
    mutationFn: (id: string) => deleteBattleSession(id),
    onSuccess: invalidate,
  });
}
