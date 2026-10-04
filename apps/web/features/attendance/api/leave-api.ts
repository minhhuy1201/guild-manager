"use server";

import type { CreateLeaveInput, Leave } from "@guild/shared/schemas";

import { authHeader } from "@/features/auth/server";
import { apiFetch } from "@/lib/api-client";

/**
 * Get the leaves that are neither cancelled nor over - the whole guild's, whoever is signed in.
 * @returns The leaves, soonest first
 */
export async function fetchLeaves(): Promise<Leave[]> {
  return apiFetch<Leave[]>("/leaves", { headers: await authHeader() });
}

/**
 * File a leave. Who may file for whom, and which days it covers, are the server's call; a refusal
 * surfaces as an `ApiError` carrying the Vietnamese sentence to show.
 * @param input - Character, days and optional reason
 * @returns The created leave
 */
export async function createLeave(input: CreateLeaveInput): Promise<Leave> {
  return apiFetch<Leave>("/leaves", {
    method: "POST",
    body: JSON.stringify(input),
    headers: await authHeader(),
  });
}

/**
 * Cancel a leave.
 * @param id - Leave to cancel
 * @returns The leave; unchanged when it was already cancelled
 */
export async function cancelLeave(id: string): Promise<Leave> {
  return apiFetch<Leave>(`/leaves/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
    headers: await authHeader(),
  });
}
