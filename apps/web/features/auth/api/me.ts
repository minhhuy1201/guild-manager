"use server";

import type { SessionUser } from "@guild/shared/schemas";

import { type ActionResult, toActionResult } from "@/lib/action-result";
import { ApiError, apiFetch } from "@/lib/api-client";
import { getAccessToken } from "./session";

/**
 * Read the full session from the backend (role and the character bound to the account).
 * Runs on the server because the access token lives in an httpOnly cookie — the client cannot attach
 * the header itself.
 * @returns Discord ID, role and character of the signed-in user; the failure (401 when signed out or
 * the session expired) as a value
 */
export async function fetchMe(): Promise<ActionResult<SessionUser>> {
  return toActionResult(async () => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new ApiError(
        "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.",
        401
      );
    }

    return apiFetch<SessionUser>("/auth/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  });
}
