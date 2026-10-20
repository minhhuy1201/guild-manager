"use server";

import type {
  AttendanceRecord,
  BattleSession,
  Character,
  MarkAttendanceInput,
  Week,
} from "@guild/shared/schemas";

import { authHeader } from "@/features/auth/server";
import { type ActionResult, toActionResult } from "@/lib/action-result";
import { apiFetch } from "@/lib/api-client";
import { recordKey } from "../lib/record-key";

/**
 * Get the characters for the attendance screen — the whole guild, whoever is signed in.
 * @returns The character list
 */
export async function fetchCharacters(): Promise<ActionResult<Character[]>> {
  return toActionResult(async () =>
    apiFetch<Character[]>("/attendance/characters", {
      headers: await authHeader(),
    })
  );
}

/**
 * Turn an optional week into the query string the two week-scoped endpoints take.
 * @param weekStart - Monday 00:00 of the week (ISO); null or undefined means the open week
 * @returns "?weekStart=…", or an empty string for the open week
 */
function weekQuery(weekStart?: string | null): string {
  return weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : "";
}

/**
 * Get the battle sessions of one week.
 * @param weekStart - Monday 00:00 of the week (ISO); omitted means the open week
 * @returns The session list
 */
export async function fetchBattleSessions(
  weekStart?: string | null
): Promise<ActionResult<BattleSession[]>> {
  return toActionResult(async () =>
    apiFetch<BattleSession[]>(`/battle-sessions${weekQuery(weekStart)}`, {
      headers: await authHeader(),
    })
  );
}

/**
 * Get the open attendance week.
 * Reads `/battle-sessions/current-week`, not the schedulable weeks: that endpoint is admin-only and
 * this screen is the one every member sees.
 * @returns The open week
 */
export async function fetchCurrentWeek(): Promise<ActionResult<Week>> {
  return toActionResult(async () =>
    apiFetch<Week>("/battle-sessions/current-week", {
      headers: await authHeader(),
    })
  );
}

/**
 * Get one week's attendance records — the whole guild's, whoever is signed in.
 * The API returns an array; components look records up by (character, session), so it is turned into a map.
 * @param weekStart - Monday 00:00 of the week (ISO); omitted means the open week
 * @returns A map of records keyed by `recordKey`
 */
export async function fetchAttendanceRecords(
  weekStart?: string | null
): Promise<ActionResult<Record<string, AttendanceRecord>>> {
  return toActionResult(async () => {
    const records = await apiFetch<AttendanceRecord[]>(
      `/attendance/records${weekQuery(weekStart)}`,
      { headers: await authHeader() }
    );

    return Object.fromEntries(
      records.map((record) => [
        recordKey(record.characterId, record.sessionId),
        record,
      ])
    );
  });
}

/**
 * Record attendance for a character in a session.
 * The deadline and the right to mark on someone's behalf are checked by the server; a refusal comes
 * back as a failure value carrying a Vietnamese message to display.
 * @param input - The attendance entry
 * @returns The written record
 */
export async function markAttendance(
  input: MarkAttendanceInput
): Promise<ActionResult<AttendanceRecord>> {
  return toActionResult(async () =>
    apiFetch<AttendanceRecord>("/attendance", {
      method: "POST",
      body: JSON.stringify(input),
      headers: await authHeader(),
    })
  );
}
