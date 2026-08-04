import { z } from "zod";

/** Chuỗi thời gian ISO — dùng cho mọi field giờ giấc đi trên dây. */
const isoDateTime = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Thời gian không hợp lệ.",
  });

/**
 * Tên bang đối thủ. Để trống được (scrim chưa chốt đối thủ, và Guild War thì
 * không bao giờ có). Chuỗi rỗng được service quy về null.
 */
const opponent = z
  .string()
  .trim()
  .max(100, "Tên bang đối thủ tối đa 100 ký tự.")
  .nullable()
  .optional();

/**
 * Body của POST /battle-sessions.
 * Dùng chung: FE validate form, BE validate request body (nestjs-zod).
 */
export const createBattleSessionSchema = z.object({
  /** Thời điểm diễn ra trận đánh (ISO string) */
  dateTime: isoDateTime,
  /** Hạn chót điểm danh do quản trị viên đặt (ISO string) */
  deadline: isoDateTime,
  opponent,
});

/** Body của PATCH /battle-sessions/:id — sửa được từng phần. */
export const updateBattleSessionSchema = createBattleSessionSchema.partial();

/** Kiểu body tạo trận đã validate. */
export type CreateBattleSessionInput = z.infer<typeof createBattleSessionSchema>;

/** Kiểu body sửa trận đã validate. */
export type UpdateBattleSessionInput = z.infer<typeof updateBattleSessionSchema>;
