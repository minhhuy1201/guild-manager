/**
 * Query key factory for the attendance domain.
 * Split out of `attendance-api.ts` so `lib/cache-graph.ts` can read the keys without pulling in
 * `apiFetch` — and to match the other three features, which already have their own key file.
 */
export const attendanceKeys = {
  all: ["attendance"] as const,
  characters: () => [...attendanceKeys.all, "characters"] as const,
  /** Prefix over every week's sessions - what an invalidation targets. */
  sessions: () => [...attendanceKeys.all, "sessions"] as const,
  /** One week's sessions; null is the open week. */
  sessionsOf: (weekStart: string | null) =>
    [...attendanceKeys.sessions(), weekStart] as const,
  week: () => [...attendanceKeys.all, "week"] as const,
  /** Prefix over every week's records - what an invalidation targets. */
  records: () => [...attendanceKeys.all, "records"] as const,
  /** One week's records; null is the open week. */
  recordsOf: (weekStart: string | null) =>
    [...attendanceKeys.records(), weekStart] as const,
};
