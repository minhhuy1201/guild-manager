"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchMembers } from "../api/members-api";
import { memberKeys } from "../api/members-keys";

/**
 * Query the member list.
 * @returns The TanStack query result (data is the member list)
 */
export function useMembers() {
  return useQuery({
    queryKey: memberKeys.list(),
    queryFn: fetchMembers,
  });
}
