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

/**
 * Đội hình và ghi chú của một trận, đúng như API trả về.
 * Ô trống KHÔNG có khoá, ô không ghi gì cũng KHÔNG có khoá — giống hệt chiều gửi lên.
 * Khác `matchSchema` ở chỗ không mang ràng buộc độ dài: chiều ra không validate,
 * schema này chỉ để suy ra kiểu.
 */
export const matchFormationSchema = z.object({
  /** slotId → characterId. Ô trống không có khoá. */
  slots: z.record(z.string(), z.string()),
  /** slotId → ghi chú. Ô không ghi gì không có khoá. */
  notes: z.record(z.string(), z.string()),
});

/** Một trận kèm đội hình đã lưu của nó, đúng như API trả về. */
export const sessionFormationSchema = z.object({
  /** ID trận đánh */
  sessionId: z.string(),
  /** Nhãn hiển thị của trận, ví dụ "Thứ 7 · Guild War" */
  label: z.string(),
  /** Thời điểm đánh (ISO string) */
  dateTime: z.string(),
  /** Trận Guild War Thứ 7 */
  isGuildWar: z.boolean(),
  /** Tên bang đối thủ, null với Guild War hoặc scrim chưa chốt đối thủ */
  opponent: z.string().nullable(),
  /** Trận đã đánh xong — không cho sửa đội hình nữa */
  locked: z.boolean(),
  /**
   * Từng trận trong ngày, theo thứ tự trận 1 → trận 2.
   * Mảng rỗng nghĩa là ngày này chưa xếp gì và cũng chưa ghi chú gì.
   */
  matches: z.array(matchFormationSchema),
});

/** Một tuần còn dữ liệu đội hình. */
export const formationWeekSchema = z.object({
  /** Mốc Thứ 2 00:00 của tuần (ISO string) */
  weekStart: z.string(),
  /**
   * Tuần điểm danh đang mở. Danh sách còn có cả tuần kế tiếp — tuần đầu mảng
   * KHÔNG phải tuần đang mở, nên client phải đọc cờ này.
   */
  isActive: z.boolean(),
});

/** Kiểu đội hình một trận API trả về. */
export type MatchFormation = z.infer<typeof matchFormationSchema>;

/** Kiểu một ngày đánh kèm đội hình API trả về. */
export type SessionFormation = z.infer<typeof sessionFormationSchema>;

/** Kiểu một tuần còn dữ liệu đội hình. */
export type FormationWeek = z.infer<typeof formationWeekSchema>;
