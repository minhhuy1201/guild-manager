import { z } from "zod";

/**
 * Đội hình trên dây: slotId → characterId.
 * Ô trống KHÔNG có khoá (không dùng null) để payload không phình vì 60 khoá rỗng.
 * Dùng chung: FE gửi lên, BE validate request body (nestjs-zod).
 */
export const assignmentSchema = z.record(z.string().min(1), z.string().min(1));

/** Body của PUT /team-builder/formations/:sessionId */
export const saveFormationSchema = z.object({
  assignment: assignmentSchema,
});

/** Kiểu đội hình trên dây đã validate. */
export type AssignmentInput = z.infer<typeof assignmentSchema>;

/** Kiểu body lưu đội hình đã validate. */
export type SaveFormationInput = z.infer<typeof saveFormationSchema>;
