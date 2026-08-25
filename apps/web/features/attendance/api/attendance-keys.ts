/**
 * Query key factory for the attendance domain.
 * Split out of `attendance-api.ts` so `lib/cache-graph.ts` can read the keys without pulling in
 * `apiFetch` — and to match the other three features, which already have their own key file.
 */
export const attendanceKeys = {
  all: ["attendance"] as const,
  characters: () => [...attendanceKeys.all, "characters"] as const,
  sessions: () => [...attendanceKeys.all, "sessions"] as const,
  week: () => [...attendanceKeys.all, "week"] as const,
  records: () => [...attendanceKeys.all, "records"] as const,
  summary: () => [...attendanceKeys.all, "summary"] as const,
};
