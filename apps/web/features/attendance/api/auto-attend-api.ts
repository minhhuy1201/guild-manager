"use server";

import type { AutoAttendStatus, SetAutoAttendInput } from "@guild/shared/schemas";

import { authHeader } from "@/features/auth/server";
import { type ActionResult, toActionResult } from "@/lib/action-result";
import { apiFetch } from "@/lib/api-client";

/**
 * Get where the signed-in member's Auto-attend stands. A caller with no character (a rescue admin)
 * comes back as a failure value, which is how the screen knows to show no switch.
 * @returns Whether it is on, and since when
 */
export async function fetchAutoAttend(): Promise<ActionResult<AutoAttendStatus>> {
  return toActionResult(async () =>
    apiFetch<AutoAttendStatus>("/auto-attend/me", { headers: await authHeader() })
  );
}

/**
 * Turn the signed-in member's Auto-attend on or off. Asking for the state it is already in changes
 * nothing, so a double press is harmless.
 * @param enabled - The state to end up in
 * @returns The status after the change
 */
export async function setAutoAttend(
  enabled: boolean
): Promise<ActionResult<AutoAttendStatus>> {
  const input: SetAutoAttendInput = { enabled };

  return toActionResult(async () =>
    apiFetch<AutoAttendStatus>("/auto-attend/me", {
      method: "PUT",
      body: JSON.stringify(input),
      headers: await authHeader(),
    })
  );
}
