"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateBattleSessionInput,
  UpdateBattleSessionInput,
} from "@shared/schemas";

import { attendanceKeys } from "@/features/attendance";
import { teamBuilderKeys } from "@/features/team-builder";
import {
  createBattleSession,
  deleteBattleSession,
  updateBattleSession,
} from "../api/battle-sessions-api";
import { settingsKeys } from "../api/battle-sessions-keys";

/** Payload sửa một trận. */
export interface UpdateSessionVariables {
  /** Id trận cần sửa */
  id: string;
  /** Các field cần đổi */
  input: UpdateBattleSessionInput;
}

/**
 * Làm mới mọi màn phụ thuộc lịch đánh sau khi thêm/sửa/xoá.
 * Bảng điểm danh đổi số cột và trang Xếp team đổi số tab, nên thiếu chỗ nào là
 * hai màn lệch nhau cho tới lần tải lại trang.
 * @returns Hàm invalidate dùng trong onSuccess của mutation
 */
function useInvalidateSchedule() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    void queryClient.invalidateQueries({ queryKey: attendanceKeys.sessions() });
    void queryClient.invalidateQueries({ queryKey: attendanceKeys.records() });
    void queryClient.invalidateQueries({ queryKey: teamBuilderKeys.all });
  };
}

/**
 * Mutation thêm trận scrim.
 * @returns Mutation TanStack (dùng mutateAsync để bắt lỗi backend)
 */
export function useCreateSession() {
  const invalidate = useInvalidateSchedule();

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
  const invalidate = useInvalidateSchedule();

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
  const invalidate = useInvalidateSchedule();

  return useMutation({
    mutationFn: (id: string) => deleteBattleSession(id),
    onSuccess: invalidate,
  });
}
