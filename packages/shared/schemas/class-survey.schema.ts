import { z } from "zod";

import { ClassChangeConfidence } from "../enums/class-change-confidence.enum";
import { GuildClass } from "../enums/guild-class.enum";

/**
 * A member's answer. "Stay" never carries a confidence, so the union makes the half-filled answer
 * (a target without a confidence, or the reverse) impossible to build.
 */
export const classSurveyAnswerInputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("KEEP") }),
  z.object({
    kind: z.literal("CHANGE"),
    targetClass: z.enum(GuildClass),
    confidence: z.enum(ClassChangeConfidence),
  }),
]);

export type ClassSurveyAnswerInput = z.infer<typeof classSurveyAnswerInputSchema>;

/** A saved answer: the input plus the member's class at the moment they answered. */
export const classSurveyAnswerSchema = z.intersection(
  z.object({ fromClass: z.enum(GuildClass) }),
  classSurveyAnswerInputSchema,
);

export type ClassSurveyAnswer = z.infer<typeof classSurveyAnswerSchema>;

/** One Class survey round. */
export const classSurveySchema = z.object({
  id: z.string(),
  title: z.string(),
  /** ISO instant of the deadline. */
  closesAt: z.string(),
  /** Computed by the server so the web never compares its own clock with the deadline. */
  isOpen: z.boolean(),
});

export type ClassSurvey = z.infer<typeof classSurveySchema>;

/** One guild member's row: their class now and their answer, null until they answer. */
export const classSurveyMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  guildClass: z.enum(GuildClass),
  answer: classSurveyAnswerSchema.nullable(),
});

export type ClassSurveyMember = z.infer<typeof classSurveyMemberSchema>;

/**
 * GET /class-surveys/current: the open survey, else the latest closed one, else null (then the page
 * only shows the current line-up). Every Character appears, whatever their role.
 */
export const classSurveyViewSchema = z.object({
  survey: classSurveySchema.nullable(),
  members: z.array(classSurveyMemberSchema),
});

export type ClassSurveyView = z.infer<typeof classSurveyViewSchema>;
