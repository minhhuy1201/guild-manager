import { z } from "zod";

import { AttendanceStatus } from "../enums/attendance.enum";

/**
 * Payload điểm danh cho một nhân vật ở một buổi đánh.
 * Dùng chung: FE validate form, BE validate request body (nestjs-zod).
 */
export const markAttendanceSchema = z.object({
  /** ID nhân vật */
  characterId: z.string().min(1, "Thiếu thành viên."),
  /** ID buổi đánh */
  sessionId: z.string().min(1, "Thiếu ngày đánh."),
  /** Trạng thái Có/Không */
  status: z.enum(AttendanceStatus),
  /**
   * Mật khẩu điểm danh riêng của nhân vật.
   * Optional vì quản trị viên điểm danh hộ không cần mật khẩu — server mới là nơi
   * quyết định ai được bỏ qua, dựa trên access token đính kèm request.
   */
  password: z.string().optional(),
});

/** Kiểu payload điểm danh đã validate. */
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
