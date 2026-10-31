"use server";

import type {
  CreateTacticInput,
  CreateTokenPresetInput,
  TacticDetail,
  TacticScene,
  TacticSummary,
  TacticTokenPreset,
  TeamColors,
  UpdateTacticInput,
} from "@guild/shared/schemas";

import { authHeader } from "@/features/auth/server";
import { type ActionResult, toActionResult } from "@/lib/action-result";
import { apiFetch } from "@/lib/api-client";

/** Arguments of `updateTactic`. `id` travels on the URL; only the fields are sent. */
export interface UpdateTacticArgs extends UpdateTacticInput {
  /** Id of the tactic being renamed */
  id: string;
}

/** Arguments of `saveTacticStages`. `id` travels on the URL; only the scene is sent. */
export interface SaveTacticStagesArgs {
  /** Id of the tactic being saved */
  id: string;
  /** The whole scene document */
  scene: TacticScene;
}

/**
 * Get every tactic, newest edit first.
 * Runs on the server because the token lives in an httpOnly cookie the client cannot attach itself.
 * @returns Tactic summaries, without their scenes; a failure value (`ok: false`) when signed out or the backend rejects it
 */
export async function fetchTactics(): Promise<ActionResult<TacticSummary[]>> {
  return toActionResult(async () =>
    apiFetch<TacticSummary[]>("/tactics", { headers: await authHeader() })
  );
}

/**
 * Get one tactic with its whole scene.
 * @param id - Tactic id
 * @returns The tactic; a failure value (`ok: false`) when signed out, the tactic is gone (404), or its scene is corrupt (500)
 */
export async function fetchTactic(id: string): Promise<ActionResult<TacticDetail>> {
  return toActionResult(async () =>
    apiFetch<TacticDetail>(`/tactics/${encodeURIComponent(id)}`, {
      headers: await authHeader(),
    })
  );
}

/**
 * Create a tactic holding one empty stage.
 * @param input - name, and an optional description
 * @returns The tactic just created; a failure value (`ok: false`) when signed out, not an admin (403), or the name is rejected (400)
 */
export async function createTactic(
  input: CreateTacticInput
): Promise<ActionResult<TacticDetail>> {
  return toActionResult(async () =>
    apiFetch<TacticDetail>("/tactics", {
      method: "POST",
      body: JSON.stringify(input),
      headers: await authHeader(),
    })
  );
}

/**
 * Rename a tactic or rewrite its description.
 * @param input - id plus the fields to change
 * @returns The updated summary; a failure value (`ok: false`) when signed out, not an admin (403), or the tactic is gone (404)
 */
export async function updateTactic(
  input: UpdateTacticArgs
): Promise<ActionResult<TacticSummary>> {
  const { id, ...fields } = input;

  return toActionResult(async () =>
    apiFetch<TacticSummary>(`/tactics/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(fields),
      headers: await authHeader(),
    })
  );
}

/**
 * Overwrite a tactic's whole scene.
 * @param input - id and the scene to write
 * @returns The tactic with the scene just written; a failure value (`ok: false`) when signed out, not an admin (403), or a limit is exceeded (400)
 */
export async function saveTacticStages(
  input: SaveTacticStagesArgs
): Promise<ActionResult<TacticDetail>> {
  return toActionResult(async () =>
    apiFetch<TacticDetail>(
      `/tactics/${encodeURIComponent(input.id)}/stages`,
      {
        method: "PUT",
        body: JSON.stringify({ scene: input.scene }),
        headers: await authHeader(),
      }
    )
  );
}

/**
 * Delete a tactic.
 * @param id - Tactic id
 * @returns Nothing on success; a failure value (`ok: false`) when signed out, not an admin (403), or the tactic is gone (404)
 */
export async function deleteTactic(id: string): Promise<ActionResult<void>> {
  return toActionResult(async () =>
    apiFetch<void>(`/tactics/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: await authHeader(),
    })
  );
}

/**
 * Get the palette's saved presets.
 * @returns Presets in display order; a failure value (`ok: false`) when signed out or the backend rejects it
 */
export async function fetchTokenPresets(): Promise<ActionResult<TacticTokenPreset[]>> {
  return toActionResult(async () =>
    apiFetch<TacticTokenPreset[]>("/tactics/token-presets", {
      headers: await authHeader(),
    })
  );
}

/**
 * Add a preset to the palette.
 * @param input - label and icon key
 * @returns The preset just created; a failure value (`ok: false`) when signed out, not an admin (403), or the label is taken (409)
 */
export async function createTokenPreset(
  input: CreateTokenPresetInput
): Promise<ActionResult<TacticTokenPreset>> {
  return toActionResult(async () =>
    apiFetch<TacticTokenPreset>("/tactics/token-presets", {
      method: "POST",
      body: JSON.stringify(input),
      headers: await authHeader(),
    })
  );
}

/**
 * Delete a preset. Tactics already drawn keep the tokens they captured.
 * @param id - Preset id
 * @returns Nothing on success; a failure value (`ok: false`) when signed out, not an admin (403), or the preset is gone (404)
 */
export async function deleteTokenPreset(id: string): Promise<ActionResult<void>> {
  return toActionResult(async () =>
    apiFetch<void>(`/tactics/token-presets/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: await authHeader(),
    })
  );
}

/**
 * Get the colour each team was given on the team builder, so a "Đội N" token wears it on the map.
 * Lives here, not in the team-builder feature: that feature's route is for managers, this read is open to every signed-in user.
 * @returns Team number (as a decimal string) → colour, a team on its default colour is absent; a failure value (`ok: false`) when signed out or the backend rejects it
 */
export async function fetchTeamColors(): Promise<ActionResult<TeamColors>> {
  return toActionResult(async () =>
    apiFetch<TeamColors>("/team-builder/team-colors", {
      headers: await authHeader(),
    })
  );
}
