"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { useInvalidate } from "@/hooks/use-invalidate";
import { fromAction } from "@/lib/action-result";
import { attendanceKeys } from "../api/attendance-keys";
import { fetchAutoAttend, setAutoAttend } from "../api/auto-attend-api";

/**
 * Query where the signed-in member's Auto-attend stands.
 * @returns The TanStack query result (data is the status; an error for an account with no character)
 */
export function useAutoAttend() {
  return useQuery({
    queryKey: attendanceKeys.autoAttend(),
    queryFn: fromAction(fetchAutoAttend),
  });
}

/**
 * The switch mutation; it stays pending until the grid and the status have refetched.
 * @returns The TanStack mutation, taking the state to end up in
 */
export function useSetAutoAttend() {
  const invalidate = useInvalidate("auto-attend");

  const switchAutoAttend = fromAction(setAutoAttend);

  return useMutation({
    // Only the boolean crosses into the Server Action: TanStack adds its mutation context as a
    // second argument, and a QueryClient cannot be serialised.
    mutationFn: (enabled: boolean) => switchAutoAttend(enabled),
    onSuccess: invalidate,
  });
}
