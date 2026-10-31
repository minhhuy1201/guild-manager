"use server";

import type { ClassSurveyView } from "@guild/shared/schemas";

import { authHeader } from "@/features/auth/server";
import { type ActionResult, toActionResult } from "@/lib/action-result";
import { apiFetch } from "@/lib/api-client";

/**
 * Get the survey the page shows - the open one, else the latest closed one, else none - with every
 * guild member and their answer.
 * @returns The survey view; `survey` is null when none has ever run
 */
export async function fetchClassSurvey(): Promise<ActionResult<ClassSurveyView>> {
  return toActionResult(async () =>
    apiFetch<ClassSurveyView>("/class-surveys/current", {
      headers: await authHeader(),
    })
  );
}
