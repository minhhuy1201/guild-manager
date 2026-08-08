"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchMembers } from "../api/members-api";
import { memberKeys } from "../api/members-keys";

/**
 * Query danh sách thành viên.
 * @returns Kết quả query TanStack (data là mảng thành viên)
 */
export function useMembers() {
  return useQuery({
    queryKey: memberKeys.list(),
    queryFn: fetchMembers,
  });
}
