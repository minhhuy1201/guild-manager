"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import type { ClassSurveyAnswerInput } from "@guild/shared/schemas";

import { useInvalidate } from "@/hooks/use-invalidate";
import { fromAction } from "@/lib/action-result";
import { classSurveyKeys } from "../api/class-survey-keys";
import { answerClassSurvey, fetchClassSurvey } from "../api/class-survey-api";

/** What the answer mutation takes: the survey and the answer for it. */
export interface AnswerClassSurveyVariables {
  surveyId: string;
  input: ClassSurveyAnswerInput;
}

/**
 * Query the survey the Class outlook page shows.
 * @returns The TanStack query result (data is the survey and the guild's answers)
 */
export function useClassSurvey() {
  return useQuery({
    queryKey: classSurveyKeys.current(),
    queryFn: fromAction(fetchClassSurvey),
  });
}

/**
 * The answer mutation; it stays pending until the page's figures and chart have refetched.
 * @returns The TanStack mutation, taking the survey id and the answer
 */
export function useAnswerClassSurvey() {
  const invalidate = useInvalidate("class-survey");
  const answer = fromAction(answerClassSurvey);

  return useMutation({
    // Only plain values cross into the Server Action: TanStack adds its mutation context as a
    // further argument, and a QueryClient cannot be serialised.
    mutationFn: ({ surveyId, input }: AnswerClassSurveyVariables) => answer(surveyId, input),
    onSuccess: invalidate,
  });
}
