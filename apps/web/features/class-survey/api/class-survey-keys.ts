/** Query key factory for the class-survey domain. Imports nothing, so `lib/cache-graph.ts` may read it. */
export const classSurveyKeys = {
  all: ["class-survey"] as const,
  /** The open survey, else the latest closed one, with a row per member. */
  current: () => [...classSurveyKeys.all, "current"] as const,
};
