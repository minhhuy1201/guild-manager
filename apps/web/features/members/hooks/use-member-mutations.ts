"use client";

import { useMutation } from "@tanstack/react-query";
import type {
  CreateCharacterInput,
  UpdateCharacterInput,
} from "@guild/shared/schemas";

import { useInvalidate } from "@/hooks/use-invalidate";
import { createMember, deleteMember, updateMember } from "../api/members-api";

/** Payload for editing a member. */
export interface UpdateMemberVariables {
  /** Id of the member to edit */
  id: string;
  /** Fields to change */
  input: UpdateCharacterInput;
}

/**
 * The create-member mutation.
 * @returns The TanStack mutation (use mutateAsync to catch backend errors)
 */
export function useCreateMember() {
  const invalidate = useInvalidate("roster");

  return useMutation({
    mutationFn: (input: CreateCharacterInput) => createMember(input),
    onSuccess: invalidate,
  });
}

/**
 * The edit-member mutation.
 * @returns The TanStack mutation (use mutateAsync to catch backend errors)
 */
export function useUpdateMember() {
  const invalidate = useInvalidate("roster");

  return useMutation({
    mutationFn: ({ id, input }: UpdateMemberVariables) =>
      updateMember(id, input),
    onSuccess: invalidate,
  });
}


/**
 * The delete-member mutation.
 * @returns The TanStack mutation (use mutateAsync to catch backend errors)
 */
export function useDeleteMember() {
  const invalidate = useInvalidate("roster");

  return useMutation({
    mutationFn: (id: string) => deleteMember(id),
    onSuccess: invalidate,
  });
}
