"use client";

import { useMutation } from "@tanstack/react-query";

import { useInvalidate } from "@/hooks/use-invalidate";
import {
  createTactic,
  deleteTactic,
  updateTactic,
} from "../api/tactics-api";

/**
 * Create a tactic.
 * @returns TanStack mutation; use mutateAsync to catch backend errors
 */
export function useCreateTactic() {
  const invalidate = useInvalidate("tactic");

  return useMutation({ mutationFn: createTactic, onSuccess: invalidate });
}

/**
 * Rename a tactic or rewrite its description.
 * @returns TanStack mutation; use mutateAsync to catch backend errors
 */
export function useUpdateTactic() {
  const invalidate = useInvalidate("tactic");

  return useMutation({ mutationFn: updateTactic, onSuccess: invalidate });
}

/**
 * Delete a tactic.
 * @returns TanStack mutation; use mutateAsync to catch backend errors
 */
export function useDeleteTactic() {
  const invalidate = useInvalidate("tactic");

  return useMutation({ mutationFn: deleteTactic, onSuccess: invalidate });
}
