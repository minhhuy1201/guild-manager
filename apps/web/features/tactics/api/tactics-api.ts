"use server";

import type {
  CreateTacticInput,
  CreateTokenPresetInput,
  TacticDetail,
  TacticScene,
  TacticSummary,
  TacticTokenPreset,
  UpdateTacticInput,
} from "@guild/shared/schemas";

import { authHeader } from "@/features/auth/server";
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
 * @returns Tactic summaries, without their scenes
 * @throws ApiError when signed out or the backend rejects it
 */
export async function fetchTactics(): Promise<TacticSummary[]> {
  return apiFetch<TacticSummary[]>("/tactics", { headers: await authHeader() });
}

/**
 * Get one tactic with its whole scene.
 * @param id - Tactic id
 * @returns The tactic
 * @throws ApiError when signed out, the tactic is gone (404), or its scene is corrupt (500)
 */
export async function fetchTactic(id: string): Promise<TacticDetail> {
  return apiFetch<TacticDetail>(`/tactics/${encodeURIComponent(id)}`, {
    headers: await authHeader(),
  });
}

/**
 * Create a tactic holding one empty stage.
 * @param input - name, and an optional description
 * @returns The tactic just created
 * @throws ApiError when signed out, not an admin (403), or the name is rejected (400)
 */
export async function createTactic(
  input: CreateTacticInput
): Promise<TacticDetail> {
  return apiFetch<TacticDetail>("/tactics", {
    method: "POST",
    body: JSON.stringify(input),
    headers: await authHeader(),
  });
}

/**
 * Rename a tactic or rewrite its description.
 * @param input - id plus the fields to change
 * @returns The updated summary
 * @throws ApiError when signed out, not an admin (403), or the tactic is gone (404)
 */
export async function updateTactic(
  input: UpdateTacticArgs
): Promise<TacticSummary> {
  const { id, ...fields } = input;

  return apiFetch<TacticSummary>(`/tactics/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(fields),
    headers: await authHeader(),
  });
}

/**
 * Overwrite a tactic's whole scene.
 * @param input - id and the scene to write
 * @returns The tactic with the scene just written
 * @throws ApiError when signed out, not an admin (403), or a limit is exceeded (400)
 */
export async function saveTacticStages(
  input: SaveTacticStagesArgs
): Promise<TacticDetail> {
  return apiFetch<TacticDetail>(
    `/tactics/${encodeURIComponent(input.id)}/stages`,
    {
      method: "PUT",
      body: JSON.stringify({ scene: input.scene }),
      headers: await authHeader(),
    }
  );
}

/**
 * Delete a tactic.
 * @param id - Tactic id
 * @throws ApiError when signed out, not an admin (403), or the tactic is gone (404)
 */
export async function deleteTactic(id: string): Promise<void> {
  await apiFetch<void>(`/tactics/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: await authHeader(),
  });
}

/**
 * Get the palette's saved presets.
 * @returns Presets in display order
 * @throws ApiError when signed out or the backend rejects it
 */
export async function fetchTokenPresets(): Promise<TacticTokenPreset[]> {
  return apiFetch<TacticTokenPreset[]>("/tactics/token-presets", {
    headers: await authHeader(),
  });
}

/**
 * Add a preset to the palette.
 * @param input - label and icon key
 * @returns The preset just created
 * @throws ApiError when signed out, not an admin (403), or the label is taken (409)
 */
export async function createTokenPreset(
  input: CreateTokenPresetInput
): Promise<TacticTokenPreset> {
  return apiFetch<TacticTokenPreset>("/tactics/token-presets", {
    method: "POST",
    body: JSON.stringify(input),
    headers: await authHeader(),
  });
}

/**
 * Delete a preset. Tactics already drawn keep the tokens they captured.
 * @param id - Preset id
 * @throws ApiError when signed out, not an admin (403), or the preset is gone (404)
 */
export async function deleteTokenPreset(id: string): Promise<void> {
  await apiFetch<void>(`/tactics/token-presets/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: await authHeader(),
  });
}
