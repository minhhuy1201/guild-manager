"use client";

import { useMutation } from "@tanstack/react-query";
import type {
  CreateCharacterInput,
  UpdateCharacterInput,
} from "@guild/shared/schemas";

import { useInvalidate } from "@/hooks/use-invalidate";
import { createMember, deleteMember, updateMember } from "../api/members-api";

/** Payload sửa một thành viên. */
export interface UpdateMemberVariables {
  /** Id thành viên cần sửa */
  id: string;
  /** Các field cần đổi */
  input: UpdateCharacterInput;
}

/**
 * Mutation thêm thành viên.
 * @returns Mutation TanStack (dùng mutateAsync để bắt lỗi backend)
 */
export function useCreateMember() {
  const invalidate = useInvalidate("roster");

  return useMutation({
    mutationFn: (input: CreateCharacterInput) => createMember(input),
    onSuccess: invalidate,
  });
}

/**
 * Mutation sửa thành viên.
 * @returns Mutation TanStack (dùng mutateAsync để bắt lỗi backend)
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
 * Mutation xoá thành viên.
 * @returns Mutation TanStack (dùng mutateAsync để bắt lỗi backend)
 */
export function useDeleteMember() {
  const invalidate = useInvalidate("roster");

  return useMutation({
    mutationFn: (id: string) => deleteMember(id),
    onSuccess: invalidate,
  });
}
