"use server";

import type {
  BattleSession,
  CreateBattleSessionInput,
  UpdateBattleSessionInput,
  Week,
} from "@guild/shared/schemas";

import { getAccessToken } from "@/features/auth/server";
import { ApiError, apiFetch } from "@/lib/api-client";

/**
 * Get the signed-in admin's access token.
 * Runs on the server because the token lives in an httpOnly cookie the client cannot read.
 * @returns The prepared Authorization header
 * @throws ApiError when the session has expired
 */
async function authHeader(): Promise<Record<string, string>> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new ApiError(
      "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.",
      401
    );
  }

  return { Authorization: `Bearer ${accessToken}` };
}

/**
 * Get the schedulable weeks: the open week and the next one.
 * @returns Two weeks, the open one first
 */
export async function fetchSettingsWeeks(): Promise<Week[]> {
  return apiFetch<Week[]>("/battle-sessions/weeks");
}

/**
 * Get one week's sessions.
 * @param weekStart - Monday marker of the week (ISO string)
 * @returns Sessions ordered by battle time
 */
export async function fetchWeekSessions(
  weekStart: string
): Promise<BattleSession[]> {
  return apiFetch<BattleSession[]>(
    `/battle-sessions?weekStart=${encodeURIComponent(weekStart)}`
  );
}

/**
 * Add a scrim.
 * @param input - Battle time, deadline and opponent guild name
 * @returns The created session
 * @throws ApiError carrying the backend's Vietnamese message when rejected
 */
export async function createBattleSession(
  input: CreateBattleSessionInput
): Promise<BattleSession> {
  return apiFetch<BattleSession>("/battle-sessions", {
    method: "POST",
    body: JSON.stringify(input),
    headers: await authHeader(),
  });
}

/**
 * Edit a session.
 * @param id - Id of the session to edit
 * @param input - Fields to change
 * @returns The updated session
 * @throws ApiError when the session was deleted (404) or the backend rejects it
 */
export async function updateBattleSession(
  id: string,
  input: UpdateBattleSessionInput
): Promise<BattleSession> {
  return apiFetch<BattleSession>(`/battle-sessions/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
    headers: await authHeader(),
  });
}

/**
 * Delete a scrim along with its attendance and formations.
 * @param id - Id of the session to delete
 * @returns A promise resolving once deleted
 * @throws ApiError for a Guild War, a past week, or an already-deleted session
 */
export async function deleteBattleSession(id: string): Promise<void> {
  await apiFetch<void>(`/battle-sessions/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: await authHeader(),
  });
}
