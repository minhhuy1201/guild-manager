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

/** Payload sửa một trận. */
export interface UpdateSessionVariables {
  /** Id trận cần sửa */
  id: string;
  /** Các field cần đổi */
  input: UpdateBattleSessionInput;
}

/**
 * Mutation thêm trận scrim.
 * @returns Mutation TanStack (dùng mutateAsync để bắt lỗi backend)
 */
export function useCreateSession() {
  const invalidate = useInvalidate("schedule");

  return useMutation({
    mutationFn: (input: CreateBattleSessionInput) => createBattleSession(input),
    onSuccess: invalidate,
  });
}

/**
 * Mutation sửa trận.
 * @returns Mutation TanStack (dùng mutateAsync để bắt lỗi backend)
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
 * Mutation xoá trận scrim.
 * @returns Mutation TanStack (dùng mutateAsync để bắt lỗi backend)
 */
export function useDeleteSession() {
  const invalidate = useInvalidate("schedule");

  return useMutation({
    mutationFn: (id: string) => deleteBattleSession(id),
    onSuccess: invalidate,
  });
}
