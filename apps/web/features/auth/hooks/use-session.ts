"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchMe } from "../api/me";

/** Query key of the session — shared so it can be invalidated after signing out. */
export const sessionKeys = { me: () => ["auth", "me"] as const };

/**
 * Query the current session (role and own character).
 * @returns The TanStack query result (data is a SessionUser)
 */
export function useSession() {
  return useQuery({ queryKey: sessionKeys.me(), queryFn: fetchMe });
}
