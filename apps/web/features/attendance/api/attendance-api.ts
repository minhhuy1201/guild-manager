"use server";

import type {
  AttendanceRecord,
  AttendanceSummary,
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
 * Get the characters for the attendance screen — the backend already filtered by the caller's role.
 * @returns The character list
 */
export async function fetchCharacters(): Promise<Character[]> {
  return apiFetch<Character[]>("/attendance/characters", {
    headers: await authHeader(),
  });
}

/**
 * Get the battle sessions of the open week.
 * @returns The session list
 */
export async function fetchBattleSessions(): Promise<BattleSession[]> {
  return apiFetch<BattleSession[]>("/battle-sessions", {
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
 * Get the open week's attendance records — the backend already filtered by the caller's role.
 * The API returns an array; components look records up by (character, session), so it is turned into a map.
 * @returns A map of records keyed by `recordKey`
 */
export async function fetchAttendanceRecords(): Promise<
  Record<string, AttendanceRecord>
> {
  const records = await apiFetch<AttendanceRecord[]>("/attendance/records", {
    headers: await authHeader(),
  });

  return Object.fromEntries(
    records.map((record) => [
      recordKey(record.characterId, record.sessionId),
      record,
    ])
  );
}

/**
 * Get the yes/no tallies per session in the open week.
 * @returns The tallies per session
 */
export async function fetchAttendanceSummary(): Promise<AttendanceSummary[]> {
  return apiFetch<AttendanceSummary[]>("/attendance/summary", {
    headers: await authHeader(),
  });
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
