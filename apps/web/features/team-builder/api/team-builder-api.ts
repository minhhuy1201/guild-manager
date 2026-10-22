"use server";

import type {
  AnnouncementResult,
  FormationWeek,
  MatchFormation,
  NotifyMembersInput,
  SaveTeamNamesInput,
  SessionFormation,
  TeamNamesState,
  TeamNoticeReport,
} from "@guild/shared/schemas";

import { authHeader } from "@/features/auth/server";
import { type ActionResult, toActionResult } from "@/lib/action-result";
import { apiFetch } from "@/lib/api-client";

/**
 * Arguments of `saveFormation`. Not the request body: `sessionId` travels on the URL and only
 * `matches` and `version` are sent — that body is `SaveFormationInput` in `@guild/shared/schemas`.
 */
export interface SaveFormationArgs {
  /** Id of the battle day to save */
  sessionId: string;
  /** Per match: the formation with empty slots dropped, and the notes with blank ones dropped */
  matches: MatchFormation[];
  /** The saved version this draft was started from */
  version: number;
}

/**
 * Get the weeks that still hold formation data.
 * Runs on the server because the endpoint is admin-only and the token lives in an httpOnly cookie the
 * client cannot attach itself.
 * @returns The weeks, newest first; a failure value (`ok: false`) when signed out or the backend rejects it
 */
export async function fetchFormationWeeks(): Promise<ActionResult<FormationWeek[]>> {
  return toActionResult(async () =>
    apiFetch<FormationWeek[]>("/team-builder/weeks", {
      headers: await authHeader(),
    })
  );
}

/**
 * Get the formations of a week's sessions.
 * @param weekStart - Monday marker of the week (ISO string); omitted = the open week
 * @returns Sessions ordered by battle time; a failure value (`ok: false`) when signed out or the backend rejects it
 */
export async function fetchFormations(
  weekStart?: string
): Promise<ActionResult<SessionFormation[]>> {
  const query = weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : "";

  return toActionResult(async () =>
    apiFetch<SessionFormation[]>(`/team-builder/formations${query}`, {
      headers: await authHeader(),
    })
  );
}

/**
 * Overwrite the whole day's formation (1 or 2 matches), notes included.
 * @param input - sessionId and each match's formation to save
 * @returns The battle day with the formation just written; a failure value (`ok: false`) when signed out, the day is locked (409), the version is stale (412), or the backend rejects it
 */
export async function saveFormation(
  input: SaveFormationArgs
): Promise<ActionResult<SessionFormation>> {
  return toActionResult(async () =>
    apiFetch<SessionFormation>(
      `/team-builder/formations/${encodeURIComponent(input.sessionId)}`,
      {
        method: "PUT",
        body: JSON.stringify({ matches: input.matches, version: input.version }),
        headers: await authHeader(),
      }
    )
  );
}

/**
 * Get the team names shown on the grid's column headers.
 * Global data — one map for the whole app, not one per week or per battle day.
 * @returns Team number (as a decimal string) → name, teams still on their number are absent, plus the version; a failure value (`ok: false`) when signed out or the backend rejects it
 */
export async function fetchTeamNames(): Promise<ActionResult<TeamNamesState>> {
  return toActionResult(async () =>
    apiFetch<TeamNamesState>("/team-builder/team-names", {
      headers: await authHeader(),
    })
  );
}

/**
 * Overwrite the whole team name map.
 * @param input - Team number (as a decimal string) → name, a team left out loses its name, plus the version the draft started from
 * @returns The map just written, at its new version; a failure value (`ok: false`) when signed out, the version is stale (412), or the backend rejects it
 */
export async function saveTeamNames(
  input: SaveTeamNamesInput
): Promise<ActionResult<TeamNamesState>> {
  return toActionResult(async () =>
    apiFetch<TeamNamesState>("/team-builder/team-names", {
      method: "PUT",
      body: JSON.stringify(input),
      headers: await authHeader(),
    })
  );
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
 * @returns How many images reached Discord; a failure value (`ok: false`) when signed out, the day is gone (404), or Discord refuses the message
 */
export async function announceFormation(
  input: AnnounceFormationArgs
): Promise<ActionResult<AnnouncementResult>> {
  return toActionResult(async () =>
    apiFetch<AnnouncementResult>(
      `/team-builder/formations/${encodeURIComponent(input.sessionId)}/announce`,
      {
        method: "POST",
        body: JSON.stringify({ images: input.images }),
        headers: await authHeader(),
      }
    )
  );
}

/** Arguments of `notifyTeamMembers`. `sessionId` travels on the URL; the rest is the body. */
export interface NotifyTeamMembersArgs {
  /** Id of the battle day whose line-up was announced */
  sessionId: string;
  /** Limit the send to these members and matches (a retry); left out, everyone is messaged */
  notices?: NotifyMembersInput["notices"];
  /** Card image of each (match, team) that has one; a team without one is messaged in text */
  teamImages?: NotifyMembersInput["teamImages"];
}

/**
 * Message each placed member which team they are in, one direct message per match.
 * @param input - sessionId, the team card images, and for a retry which members and matches to message
 * @returns How many messages were sent and who did not get one; a failure value (`ok: false`) when signed out, the day is gone (404), or its attendance is still open (400)
 */
export async function notifyTeamMembers(
  input: NotifyTeamMembersArgs
): Promise<ActionResult<TeamNoticeReport>> {
  return toActionResult(async () =>
    apiFetch<TeamNoticeReport>(
      `/team-builder/formations/${encodeURIComponent(input.sessionId)}/notify-members`,
      {
        method: "POST",
        body: JSON.stringify({
          notices: input.notices,
          teamImages: input.teamImages,
        }),
        headers: await authHeader(),
      }
    )
  );
}
