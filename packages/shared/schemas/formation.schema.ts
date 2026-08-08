import { z } from "zod";

/**
 * Đội hình trên dây: slotId → characterId.
 * Ô trống KHÔNG có khoá (không dùng null) để payload không phình vì 60 khoá rỗng.
 * Dùng chung: FE gửi lên, BE validate request body (nestjs-zod).
 */
export const assignmentSchema = z.record(z.string().min(1), z.string().min(1));

/** Độ dài tối đa của một ghi chú — vừa bề ngang ô nhập trên lưới. */
export const NOTE_MAX_LENGTH = 60;

/**
 * Ghi chú theo ô: slotId → text.
 * Ô không ghi gì KHÔNG có khoá, giống hệt cách ô trống không có khoá ở assignment.
 * `.trim()` để một ô chỉ chứa khoảng trắng bị từ chối chứ không lưu thành ghi chú rỗng.
 */
export const notesSchema = z.record(
  z.string().min(1),
  z.string().trim().min(1).max(NOTE_MAX_LENGTH),
);

/** Một trận: ai đứng ở đâu, kèm ghi chú của từng ô. */
export const matchSchema = z.object({
  slots: assignmentSchema,
  notes: notesSchema,
});

/**
 * Body của PUT /team-builder/formations/:sessionId — đội hình CẢ NGÀY.
 * Một ngày có 1 hoặc 2 trận; trần 2 đặt ở đây chứ không ở cấu trúc bảng, nên
 * sau này muốn 3 trận chỉ phải sửa con số này.
 */
export const saveFormationSchema = z.object({
  matches: z.array(matchSchema).min(1).max(2),
});

/** Kiểu đội hình trên dây đã validate. */
export type AssignmentInput = z.infer<typeof assignmentSchema>;

/** Kiểu một trận (đội hình + ghi chú) đã validate. */
export type MatchInput = z.infer<typeof matchSchema>;

/** Kiểu body lưu đội hình đã validate. */
export type SaveFormationInput = z.infer<typeof saveFormationSchema>;
