import { ClassChangeConfidence } from "@guild/shared/enums";
import type { GuildClass } from "@guild/shared/enums";
import type { ClassSurveyAnswer, ClassSurveyAnswerInput } from "@guild/shared/schemas";

/** The picker's "stay" entry; every other value is a class to move to. */
export const KEEP_CHOICE = "KEEP";

/** What the picker holds: stay, a class to move to, or nothing picked yet. */
export type AnswerChoice = typeof KEEP_CHOICE | GuildClass | null;

/** The form's working state. */
export interface AnswerDraft {
  choice: AnswerChoice;
  confidence: ClassChangeConfidence;
}

/**
 * Start the form from the saved answer. A member who has not answered has nothing picked, so the
 * save button stays off until they choose.
 * @param answer - The member's saved answer, null until they answer
 * @returns The draft to edit
 */
export function draftOf(answer: ClassSurveyAnswer | null): AnswerDraft {
  if (!answer) return { choice: null, confidence: ClassChangeConfidence.SURE };
  if (answer.kind === "KEEP") return { choice: KEEP_CHOICE, confidence: ClassChangeConfidence.SURE };

  return { choice: answer.targetClass, confidence: answer.confidence };
}

/**
 * The request body for a draft.
 * @param draft - The form's state
 * @returns The answer to send, or null while nothing is picked
 */
export function toAnswerInput(draft: AnswerDraft): ClassSurveyAnswerInput | null {
  if (draft.choice === null) return null;
  if (draft.choice === KEEP_CHOICE) return { kind: "KEEP" };

  return { kind: "CHANGE", targetClass: draft.choice, confidence: draft.confidence };
}

/**
 * Whether a draft is the saved answer, so saving it again would change nothing.
 * @param draft - The form's state
 * @param answer - The member's saved answer
 * @returns True when they agree
 */
export function isSameAnswer(draft: AnswerDraft, answer: ClassSurveyAnswer | null): boolean {
  const saved = draftOf(answer);
  if (draft.choice !== saved.choice) return false;

  return draft.choice === KEEP_CHOICE || draft.confidence === saved.confidence;
}
