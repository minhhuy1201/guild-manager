"use client";

import { useQuery } from "@tanstack/react-query";

import { fromAction } from "@/lib/action-result";
import { classSurveyKeys } from "../api/class-survey-keys";
import { fetchClassSurvey } from "../api/class-survey-api";

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
