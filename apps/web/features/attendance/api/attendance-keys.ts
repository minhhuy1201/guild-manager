/**
 * Query key factory cho domain điểm danh.
 * Tách khỏi `attendance-api.ts` để `lib/cache-graph.ts` đọc được key mà không
 * kéo theo `apiFetch` — và cho khớp ba feature kia, vốn đã có file key riêng.
 */
export const attendanceKeys = {
  all: ["attendance"] as const,
  characters: () => [...attendanceKeys.all, "characters"] as const,
  sessions: () => [...attendanceKeys.all, "sessions"] as const,
  week: () => [...attendanceKeys.all, "week"] as const,
  records: () => [...attendanceKeys.all, "records"] as const,
  summary: () => [...attendanceKeys.all, "summary"] as const,
};
