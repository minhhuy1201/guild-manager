"use server";

import type {
  CreateCharacterInput,
  GuildMember,
  UpdateCharacterInput,
} from "@guild/shared/schemas";

import { authHeader } from "@/features/auth/server";
import { type ActionResult, toActionResult } from "@/lib/action-result";
import { apiFetch } from "@/lib/api-client";

/**
 * Get the member list.
 * @returns Members ordered by name
 */
export async function fetchMembers(): Promise<ActionResult<GuildMember[]>> {
  return toActionResult(async () =>
    apiFetch<GuildMember[]>("/characters", { headers: await authHeader() })
  );
}

/**
 * Add a member.
 * @param input - Name, class and optionally the Discord ID
 * @returns The created member; a failure value (`ok: false`) carrying the backend's Vietnamese message when rejected — 409 when the Discord
 * ID already belongs to another member
 */
export async function createMember(
  input: CreateCharacterInput
): Promise<ActionResult<GuildMember>> {
  return toActionResult(async () =>
    apiFetch<GuildMember>("/characters", {
      method: "POST",
      body: JSON.stringify(input),
      headers: await authHeader(),
    })
  );
}

/**
 * Edit a member's name, class, Discord ID or role.
 * @param id - Member id
 * @param input - Fields to change
 * @returns The updated member; a failure value (`ok: false`) when the member was deleted (404) or the Discord ID belongs to someone else (409)
 */
export async function updateMember(
  id: string,
  input: UpdateCharacterInput
): Promise<ActionResult<GuildMember>> {
  return toActionResult(async () =>
    apiFetch<GuildMember>(`/characters/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
      headers: await authHeader(),
    })
  );
}


/**
 * Delete a member along with their attendance history and formation slots.
 * @param id - Member id
 * @returns A promise resolving once deleted; a failure value (`ok: false`) when the member was already deleted (404)
 */
export async function deleteMember(id: string): Promise<ActionResult<void>> {
  return toActionResult(async () =>
    apiFetch<void>(`/characters/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: await authHeader(),
    })
  );
}
