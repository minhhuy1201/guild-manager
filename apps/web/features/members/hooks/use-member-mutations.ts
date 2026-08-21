"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateCharacterInput,
  UpdateCharacterInput,
} from "@guild/shared/schemas";

import { attendanceKeys } from "@/features/attendance";
import { teamBuilderKeys } from "@/features/team-builder";
import { createMember, deleteMember, updateMember } from "../api/members-api";
import { memberKeys } from "../api/members-keys";

/** Payload sửa một thành viên. */
export interface UpdateMemberVariables {
  /** Id thành viên cần sửa */
  id: string;
  /** Các field cần đổi */
  input: UpdateCharacterInput;
}

/**
 * Làm mới mọi màn phụ thuộc danh sách thành viên sau khi thêm/sửa/xoá.
 * Bảng điểm danh và trang Xếp team đều liệt kê nhân vật, thiếu chỗ nào là
 * các màn lệch nhau cho tới lần tải lại trang.
 * @returns Hàm invalidate dùng trong onSuccess của mutation
 */
function useInvalidateMembers() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: memberKeys.all });
    void queryClient.invalidateQueries({
      queryKey: attendanceKeys.characters(),
    });
    void queryClient.invalidateQueries({ queryKey: attendanceKeys.records() });
    void queryClient.invalidateQueries({ queryKey: teamBuilderKeys.all });
  };
}

/**
 * Mutation thêm thành viên.
 * @returns Mutation TanStack (dùng mutateAsync để bắt lỗi backend)
 */
export function useCreateMember() {
  const invalidate = useInvalidateMembers();

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
  const invalidate = useInvalidateMembers();

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
  const invalidate = useInvalidateMembers();

  return useMutation({
    mutationFn: (id: string) => deleteMember(id),
    onSuccess: invalidate,
  });
}
