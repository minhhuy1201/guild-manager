import { z } from "zod";

/** Attendance payload for one character in one session (form + request body). */
export const markAttendanceSchema = z.object({
  characterId: z.string().min(1, "Thiếu thành viên."),
  sessionId: z.string().min(1, "Thiếu ngày đánh."),
  /** True = "Có" (đi đánh), false = "Không". */
  isPresent: z.boolean(),
});

export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;

/** One attendance entry as the API returns it. */
export const attendanceRecordSchema = z.object({
  characterId: z.string(),
  sessionId: z.string(),
  /** True = "Có" (đi đánh), false = "Không". */
  isPresent: z.boolean(),
  /** When attendance was recorded (ISO string) */
  markedAt: z.string(),
});

export type AttendanceRecord = z.infer<typeof attendanceRecordSchema>;

/**
 * Attendance tallies for a session, without identities. Members only see their own
 * row and so lose the sense of "this session is short-handed"; these counts restore
 * it without revealing who signed up for what.
 */
export const attendanceSummarySchema = z.object({
  sessionId: z.string(),
  /** Number of yes answers */
  coCount: z.number().int().nonnegative(),
  /** Number of no answers */
  khongCount: z.number().int().nonnegative(),
});

export type AttendanceSummary = z.infer<typeof attendanceSummarySchema>;
