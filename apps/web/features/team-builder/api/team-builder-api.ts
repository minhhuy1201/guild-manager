"use server";

import type {
  AnnouncementResult,
  FormationWeek,
  MatchFormation,
  SessionFormation,
  TeamNames,
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

/**
 * Get the team names shown on the grid's column headers.
 * Global data — one map for the whole app, not one per week or per battle day.
 * @returns Team number (as a decimal string) → name; teams still on their number are absent
 * @throws ApiError when signed out or the backend rejects it
 */
export async function fetchTeamNames(): Promise<TeamNames> {
  return apiFetch<TeamNames>("/team-builder/team-names", {
    headers: await authHeader(),
  });
}

/**
 * Overwrite the whole team name map.
 * @param names - Team number (as a decimal string) → name; a team left out loses its name
 * @returns The map just written
 * @throws ApiError when signed out or the backend rejects it
 */
export async function saveTeamNames(names: TeamNames): Promise<TeamNames> {
  return apiFetch<TeamNames>("/team-builder/team-names", {
    method: "PUT",
    body: JSON.stringify({ names }),
    headers: await authHeader(),
  });
}

/** Arguments of `announceFormation`. `sessionId` travels on the URL; only `images` is sent. */
export interface AnnounceFormationArgs {
  /** Id of the battle day being announced */
  sessionId: string;
  /** One `data:image/webp;base64,…` per match, in match order */
  images: string[];
}

/**
 * Post the day's line-up to Discord, with one image per match.
 * @param input - sessionId and the captured images
 * @returns How many images reached Discord
 * @throws ApiError when signed out, the day is gone (404), or Discord refuses the message
 */
export async function announceFormation(
  input: AnnounceFormationArgs
): Promise<AnnouncementResult> {
  return apiFetch<AnnouncementResult>(
    `/team-builder/formations/${encodeURIComponent(input.sessionId)}/announce`,
    {
      method: "POST",
      body: JSON.stringify({ images: input.images }),
      headers: await authHeader(),
    }
  );
}
