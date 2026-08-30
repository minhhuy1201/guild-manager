"use server";

import type {
  CreateCharacterInput,
  GuildMember,
  UpdateCharacterInput,
} from "@guild/shared/schemas";

import { getAccessToken } from "@/features/auth/server";
import { ApiError, apiFetch } from "@/lib/api-client";

/**
 * Get the signed-in admin's access token.
 * Runs on the server because the token lives in an httpOnly cookie the client cannot read.
 * (Duplicated in features/settings and features/team-builder — a "use server" file may only export
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
 * Get the member list.
 * @returns Members ordered by name
 */
export async function fetchMembers(): Promise<GuildMember[]> {
  return apiFetch<GuildMember[]>("/characters", { headers: await authHeader() });
}

/**
 * Add a member.
 * @param input - Name, class and optionally the Discord ID
 * @returns The created member
 * @throws ApiError carrying the backend's Vietnamese message when rejected — 409 when the Discord
 * ID already belongs to another member
 */
export async function createMember(
  input: CreateCharacterInput
): Promise<GuildMember> {
  return apiFetch<GuildMember>("/characters", {
    method: "POST",
    body: JSON.stringify(input),
    headers: await authHeader(),
  });
}

/**
 * Edit a member's name, class, Discord ID or role.
 * @param id - Member id
 * @param input - Fields to change
 * @returns The updated member
 * @throws ApiError when the member was deleted (404) or the Discord ID belongs to someone else (409)
 */
export async function updateMember(
  id: string,
  input: UpdateCharacterInput
): Promise<GuildMember> {
  return apiFetch<GuildMember>(`/characters/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
    headers: await authHeader(),
  });
}


/**
 * Delete a member along with their attendance history and formation slots.
 * @param id - Member id
 * @returns A promise resolving once deleted
 * @throws ApiError when the member was already deleted (404)
 */
export async function deleteMember(id: string): Promise<void> {
  await apiFetch<void>(`/characters/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: await authHeader(),
  });
}
