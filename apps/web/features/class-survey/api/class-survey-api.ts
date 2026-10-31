"use server";

import type {
  ClassSurveyAnswer,
  ClassSurveyAnswerInput,
  ClassSurveyView,
} from "@guild/shared/schemas";

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

/**
 * Save the signed-in member's own answer. Whether the survey is still open and whether the target
 * differs from their class are the server's call; a refusal comes back as a failure value carrying
 * the Vietnamese sentence to show.
 * @param surveyId - Survey being answered
 * @param input - Stay, or the class to move to and how sure
 * @returns The saved answer
 */
export async function answerClassSurvey(
  surveyId: string,
  input: ClassSurveyAnswerInput
): Promise<ActionResult<ClassSurveyAnswer>> {
  return toActionResult(async () =>
    apiFetch<ClassSurveyAnswer>(`/class-surveys/${encodeURIComponent(surveyId)}/answers/me`, {
      method: "PUT",
      body: JSON.stringify(input),
      headers: await authHeader(),
    })
  );
}
