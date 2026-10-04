import { z } from "zod";
import { ATTENDANCE_REASON_MAX_LENGTH } from "./attendance.schema";

/** A Vietnam calendar day. Lexical order equals date order, which the overlap check relies on. */
export const leaveDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ.")
  // Rejects `2026-02-31` (Date.UTC would roll it into March) and `2026-13-01` (an Invalid Date, whose
  // `toISOString()` throws - a throw inside a refine escapes `safeParse` as a 500).
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);

    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
  }, "Ngày không hợp lệ.");

export const createLeaveSchema = z
  .object({
    characterId: z.string().min(1, "Thiếu thành viên."),
    startDate: leaveDateSchema,
    endDate: leaveDateSchema,
    reason: z.string().trim().max(ATTENDANCE_REASON_MAX_LENGTH, "Lý do tối đa 255 ký tự.").nullish(),
  })
  .refine((input) => input.endDate >= input.startDate, {
    message: "Ngày kết thúc phải từ ngày bắt đầu trở đi.",
    path: ["endDate"],
  });

export type CreateLeaveInput = z.infer<typeof createLeaveSchema>;

export const leaveSchema = z.object({
  id: z.string(),
  characterId: z.string(),
  startDate: leaveDateSchema,
  endDate: leaveDateSchema,
  reason: z.string().nullable(),
  /** Character of whoever filed it - a member, or an admin acting for them; null for a rescue admin */
  createdByCharacterId: z.string().nullable(),
  /** ISO instant */
  createdAt: z.string(),
});

export type Leave = z.infer<typeof leaveSchema>;
