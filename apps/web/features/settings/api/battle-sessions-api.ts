"use server";

import type {
  BattleSession,
  CreateBattleSessionInput,
  UpdateBattleSessionInput,
  Week,
} from "@guild/shared/schemas";

import { authHeader } from "@/features/auth/server";
import { type ActionResult, toActionResult } from "@/lib/action-result";
import { apiFetch } from "@/lib/api-client";

/**
 * Get the schedulable weeks: the open week and the next one.
 * @returns Two weeks, the open one first
 */
export async function fetchSettingsWeeks(): Promise<ActionResult<Week[]>> {
  return toActionResult(async () =>
    apiFetch<Week[]>("/battle-sessions/weeks", {
      headers: await authHeader(),
    })
  );
}

/**
 * Get one week's sessions.
 * @param weekStart - Monday marker of the week (ISO string); omitted = the open week
 * @returns Sessions ordered by battle time
 */
export async function fetchWeekSessions(
  weekStart?: string
): Promise<ActionResult<BattleSession[]>> {
  const query = weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : "";

  return toActionResult(async () =>
    apiFetch<BattleSession[]>(`/battle-sessions${query}`, {
      headers: await authHeader(),
    })
  );
}

/**
 * Add a scrim.
 * @param input - Battle time, deadline and opponent guild name
 * @returns The created session
 * @returns A failure value (`ok: false`) carrying the backend's Vietnamese message when rejected
 */
export async function createBattleSession(
  input: CreateBattleSessionInput
): Promise<ActionResult<BattleSession>> {
  return toActionResult(async () =>
    apiFetch<BattleSession>("/battle-sessions", {
      method: "POST",
      body: JSON.stringify(input),
      headers: await authHeader(),
    })
  );
}

/**
 * Edit a session.
 * @param id - Id of the session to edit
 * @param input - Fields to change
 * @returns The updated session
 * @returns A failure value (`ok: false`) when the session was deleted (404) or the backend rejects it
 */
export async function updateBattleSession(
  id: string,
  input: UpdateBattleSessionInput
): Promise<ActionResult<BattleSession>> {
  return toActionResult(async () =>
    apiFetch<BattleSession>(`/battle-sessions/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
      headers: await authHeader(),
    })
  );
}

/**
 * Reopen a day whose attendance an announcement closed.
 * @param id - Id of the session to reopen
 * @returns The session, attendance open again
 * @returns A failure value (`ok: false`) when the session is gone (404) or its deadline has already passed (400)
 */
export async function reopenAttendance(id: string): Promise<ActionResult<BattleSession>> {
  return toActionResult(async () =>
    apiFetch<BattleSession>(
      `/battle-sessions/${encodeURIComponent(id)}/reopen-attendance`,
      { method: "POST", headers: await authHeader() }
    )
  );
}

/**
 * Delete a scrim along with its attendance and formations.
 * @param id - Id of the session to delete
 * @returns A promise resolving once deleted
 * @returns A failure value (`ok: false`) for a Guild War, a past week, or an already-deleted session
 */
export async function deleteBattleSession(id: string): Promise<ActionResult<void>> {
  return toActionResult(async () =>
    apiFetch<void>(`/battle-sessions/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: await authHeader(),
    })
  );
}
