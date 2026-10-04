"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { useInvalidate } from "@/hooks/use-invalidate";
import { attendanceKeys } from "../api/attendance-keys";
import { cancelLeave, createLeave, fetchLeaves } from "../api/leave-api";

/**
 * Query the active leaves of the whole guild.
 * @returns The TanStack query result (data is the leave list, soonest first)
 */
export function useLeaves() {
  return useQuery({
    queryKey: attendanceKeys.leaves(),
    queryFn: fetchLeaves,
  });
}

/**
 * The file-a-leave mutation; it stays pending until the grid and the leave list have refetched.
 * @returns The TanStack mutation
 */
export function useCreateLeave() {
  const invalidate = useInvalidate("leave");

  return useMutation({ mutationFn: createLeave, onSuccess: invalidate });
}

/**
 * The cancel-a-leave mutation.
 * @returns The TanStack mutation
 */
export function useCancelLeave() {
  const invalidate = useInvalidate("leave");

  return useMutation({ mutationFn: cancelLeave, onSuccess: invalidate });
}
