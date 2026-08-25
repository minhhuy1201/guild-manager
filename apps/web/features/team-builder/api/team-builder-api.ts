"use server";

import type {
  FormationWeek,
  MatchFormation,
  SessionFormation,
} from "@guild/shared/schemas";

import { getAccessToken } from "@/features/auth/server";
import { ApiError, apiFetch } from "@/lib/api-client";

/**
 * Arguments of `saveFormation`. Not the request body: `sessionId` travels on the URL and only
 * `matches` is sent — that body is `SaveFormationInput` in `@guild/shared/schemas`.
 */
export interface SaveFormationArgs {
  /** Id of the battle day to save */
  sessionId: string;
  /** Per match: the formation with empty slots dropped, and the notes with blank ones dropped */
  matches: MatchFormation[];
}

/**
 * Get the signed-in admin's access token.
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
 * Get the weeks that still hold formation data.
 * Runs on the server because the endpoint is admin-only and the token lives in an httpOnly cookie the
 * client cannot attach itself.
 * @returns The weeks, newest first
 * @throws ApiError when signed out or the backend rejects it
 */
export async function fetchFormationWeeks(): Promise<FormationWeek[]> {
  return apiFetch<FormationWeek[]>("/team-builder/weeks", {
    headers: await authHeader(),
  });
}

/**
 * Get the formations of a week's sessions.
 * @param weekStart - Monday marker of the week (ISO string); omitted = the open week
 * @returns Sessions ordered by battle time
 * @throws ApiError when signed out or the backend rejects it
 */
export async function fetchFormations(
  weekStart?: string
): Promise<SessionFormation[]> {
  const query = weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : "";

  return apiFetch<SessionFormation[]>(`/team-builder/formations${query}`, {
    headers: await authHeader(),
  });
}

/**
 * Overwrite the whole day's formation (1 or 2 matches), notes included.
 * @param input - sessionId and each match's formation to save
 * @returns The battle day with the formation just written
 * @throws ApiError when signed out, the day is locked (409), or the backend rejects it
 */
export async function saveFormation(
  input: SaveFormationArgs
): Promise<SessionFormation> {
  return apiFetch<SessionFormation>(
    `/team-builder/formations/${encodeURIComponent(input.sessionId)}`,
    {
      method: "PUT",
      body: JSON.stringify({ matches: input.matches }),
      headers: await authHeader(),
    }
  );
}
