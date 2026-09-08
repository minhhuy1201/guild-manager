"use server";

import type {
  AttendanceRecord,
  BattleSession,
  Character,
  MarkAttendanceInput,
  Week,
} from "@guild/shared/schemas";

import { getAccessToken } from "@/features/auth/server";
import { ApiError, apiFetch } from "@/lib/api-client";
import { recordKey } from "../lib/record-key";

/**
 * Get the signed-in user's access token.
 * Runs on the server because the token lives in an httpOnly cookie the client cannot read.
 * (Duplicated in features/members, settings and team-builder — a "use server" file may only export
 * async functions, so it cannot be shared.)
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
 * Get the characters for the attendance screen — the whole guild, whoever is signed in.
 * @returns The character list
 */
export async function fetchCharacters(): Promise<Character[]> {
  return apiFetch<Character[]>("/attendance/characters", {
    headers: await authHeader(),
  });
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
): Promise<BattleSession[]> {
  return apiFetch<BattleSession[]>(`/battle-sessions${weekQuery(weekStart)}`, {
    headers: await authHeader(),
  });
}

/**
 * Get the open attendance week.
 * Reads `/battle-sessions/current-week`, not the schedulable weeks: that endpoint is admin-only and
 * this screen is the one every member sees.
 * @returns The open week
 */
export async function fetchCurrentWeek(): Promise<Week> {
  return apiFetch<Week>("/battle-sessions/current-week", {
    headers: await authHeader(),
  });
}

/**
 * Get one week's attendance records — the whole guild's, whoever is signed in.
 * The API returns an array; components look records up by (character, session), so it is turned into a map.
 * @param weekStart - Monday 00:00 of the week (ISO); omitted means the open week
 * @returns A map of records keyed by `recordKey`
 */
export async function fetchAttendanceRecords(
  weekStart?: string | null
): Promise<Record<string, AttendanceRecord>> {
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
}

/**
 * Record attendance for a character in a session.
 * The deadline and the right to mark on someone's behalf are checked by the server; failures surface
 * as an `ApiError` carrying a Vietnamese message to display.
 * @param input - The attendance entry
 * @returns The written record
 */
export async function markAttendance(
  input: MarkAttendanceInput
): Promise<AttendanceRecord> {
  return apiFetch<AttendanceRecord>("/attendance", {
    method: "POST",
    body: JSON.stringify(input),
    headers: await authHeader(),
  });
}
