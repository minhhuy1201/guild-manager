import type { ClassChangeConfidence, GuildClass } from '@guild/shared/enums';
import {
  classSurveyAnswerSchema,
  classSurveySchema,
  classSurveyViewSchema,
  type ClassSurvey,
  type ClassSurveyAnswer,
  type ClassSurveyMember,
  type ClassSurveyView,
} from '@guild/shared/schemas';

import { verifyResponse } from '../../config';

/** The ClassSurvey columns the codec needs. */
export type ClassSurveyRow = {
  id: string;
  title: string;
  closesAt: Date;
};

/** The ClassSurveyAnswer columns the codec needs. */
export type ClassSurveyAnswerRow = {
  characterId: string;
  fromClass: string;
  targetClass: string | null;
  confidence: string | null;
};

/** The Character columns the codec needs. */
export type ClassSurveyCharacterRow = {
  id: string;
  name: string;
  guildClass: string;
};

/**
 * Turn a survey row into the object returned to the client.
 * @param row - Row read from Prisma
 * @param now - The instant the response is built at, from `Clock`
 * @returns The contract-shaped survey, `isOpen` decided here so the web never compares clocks
 */
export function toClassSurvey(row: ClassSurveyRow, now: Date): ClassSurvey {
  return verifyResponse(classSurveySchema, {
    id: row.id,
    title: row.title,
    closesAt: row.closesAt.toISOString(),
    isOpen: now < row.closesAt,
  } satisfies ClassSurvey);
}

/**
 * A stored answer with no target is "stay"; the database CHECK guarantees the confidence is then
 * null too, so the two never disagree here.
 * @param answer - The stored row
 * @returns The answer as the contract describes it
 */
function toAnswerShape(answer: ClassSurveyAnswerRow): ClassSurveyAnswer {
  // Prisma's enum unions are the shared enums' values (kept in step by prisma-enum-sync.spec.ts);
  // `verifyResponse` checks the casts outside production.
  const fromClass = answer.fromClass as GuildClass;

  if (answer.targetClass === null) return { kind: 'KEEP', fromClass };

  return {
    kind: 'CHANGE',
    fromClass,
    targetClass: answer.targetClass as GuildClass,
    confidence: answer.confidence as ClassChangeConfidence,
  };
}

/**
 * Turn a saved answer row into the object returned to the client.
 * @param row - Row read from Prisma
 * @returns The contract-shaped answer
 */
export function toClassSurveyAnswer(
  row: ClassSurveyAnswerRow,
): ClassSurveyAnswer {
  return verifyResponse(classSurveyAnswerSchema, toAnswerShape(row));
}

/**
 * One member's row.
 * @param character - The member
 * @param answer - Their answer in this survey, or undefined when they have not answered
 * @returns The contract-shaped row
 */
function toMember(
  character: ClassSurveyCharacterRow,
  answer: ClassSurveyAnswerRow | undefined,
): ClassSurveyMember {
  return {
    id: character.id,
    name: character.name,
    guildClass: character.guildClass as GuildClass,
    answer: answer ? toAnswerShape(answer) : null,
  };
}

/**
 * Build the page view.
 * @param survey - The survey to show, null when none has ever run
 * @param answers - That survey's answers (empty without a survey)
 * @param characters - Every Character, whatever the role
 * @param now - The instant the response is built at, from `Clock`
 * @returns The contract-shaped view
 */
export function toClassSurveyView(
  survey: ClassSurveyRow | null,
  answers: readonly ClassSurveyAnswerRow[],
  characters: readonly ClassSurveyCharacterRow[],
  now: Date,
): ClassSurveyView {
  const answerByCharacter = new Map(
    answers.map((answer) => [answer.characterId, answer]),
  );

  return verifyResponse(classSurveyViewSchema, {
    survey: survey ? toClassSurvey(survey, now) : null,
    members: characters.map((character) =>
      toMember(character, answerByCharacter.get(character.id)),
    ),
  } satisfies ClassSurveyView);
}
