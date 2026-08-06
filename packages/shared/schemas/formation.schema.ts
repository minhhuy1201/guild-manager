import { z } from "zod";

/**
 * Đội hình trên dây: slotId → characterId.
 * Ô trống KHÔNG có khoá (không dùng null) để payload không phình vì 60 khoá rỗng.
 * Dùng chung: FE gửi lên, BE validate request body (nestjs-zod).
 */
export const assignmentSchema = z.record(z.string().min(1), z.string().min(1));

/**
 * Body của PUT /team-builder/formations/:sessionId — đội hình CẢ NGÀY.
 * Một ngày có 1 hoặc 2 trận; trần 2 đặt ở đây chứ không ở cấu trúc bảng, nên
 * sau này muốn 3 trận chỉ phải sửa con số này.
 */
export const saveFormationSchema = z.object({
  matches: z.array(assignmentSchema).min(1).max(2),
});

/** Kiểu đội hình trên dây đã validate. */
export type AssignmentInput = z.infer<typeof assignmentSchema>;

/** Kiểu body lưu đội hình đã validate. */
export type SaveFormationInput = z.infer<typeof saveFormationSchema>;
