import { describe, expect, it } from "vitest";
import { ClassChangeConfidence, GuildClass } from "@guild/shared/enums";

import { KEEP_CHOICE, draftOf, isSameAnswer, toAnswerInput } from "../lib/answer-draft";

const CHANGE = {
  kind: "CHANGE",
  fromClass: GuildClass.CUU_LINH,
  targetClass: GuildClass.TO_VAN,
  confidence: ClassChangeConfidence.CONSIDERING,
} as const;

describe("answer draft", () => {
  it("starts empty without a saved answer, and sends nothing", () => {
    const draft = draftOf(null);

    expect(draft.choice).toBeNull();
    expect(toAnswerInput(draft)).toBeNull();
  });

  it("starts from a saved change and sends it back unchanged", () => {
    expect(toAnswerInput(draftOf(CHANGE))).toEqual({
      kind: "CHANGE",
      targetClass: GuildClass.TO_VAN,
      confidence: ClassChangeConfidence.CONSIDERING,
    });
  });

  it("sends keep without a confidence", () => {
    const draft = draftOf({ kind: "KEEP", fromClass: GuildClass.CUU_LINH });

    expect(draft.choice).toBe(KEEP_CHOICE);
    expect(toAnswerInput(draft)).toEqual({ kind: "KEEP" });
  });

  it("tells an edited draft from the saved answer", () => {
    const saved = draftOf(CHANGE);

    expect(isSameAnswer(saved, CHANGE)).toBe(true);
    expect(isSameAnswer({ ...saved, confidence: ClassChangeConfidence.SURE }, CHANGE)).toBe(false);
    expect(isSameAnswer({ ...saved, choice: KEEP_CHOICE }, CHANGE)).toBe(false);
  });
});
