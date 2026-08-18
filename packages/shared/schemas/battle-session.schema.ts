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

/** Một trận đánh API trả về, thời gian ở dạng ISO string. */
export const battleSessionSchema = z.object({
  id: z.string(),
  /** Nhãn hiển thị suy ra từ giờ đánh, ví dụ "Thứ 3 · 20:30". Không lưu trong database. */
  label: z.string(),
  dateTime: isoDateTime,
  /** Hạn chót điểm danh do quản trị viên đặt. */
  deadline: isoDateTime,
  isGuildWar: z.boolean(),
  /** Tên bang đối thủ, null với Guild War hoặc scrim chưa chốt đối thủ. */
  opponent: z.string().nullable(),
  /** Mốc Thứ 2 00:00 của tuần chứa trận này. */
  weekStart: isoDateTime,
  /** Số lượt điểm danh đã ghi — dialog xoá cần con số này. */
  attendanceCount: z.number(),
  /** Trận này đã có đội hình xếp sẵn hay chưa. */
  hasFormation: z.boolean(),
});

/** Một tuần điểm danh API trả về. */
export const weekSchema = z.object({
  /** Thứ 2 00:00 (ISO string) */
  weekStart: isoDateTime,
  /** Thứ 7 23:59 (ISO string) */
  weekEnd: isoDateTime,
  /** Có phải tuần đang mở không (phần tử còn lại là tuần kế tiếp) */
  isActive: z.boolean(),
});

/** Kiểu một trận đánh API trả về. */
export type BattleSession = z.infer<typeof battleSessionSchema>;

/** Kiểu một tuần điểm danh API trả về. */
export type Week = z.infer<typeof weekSchema>;
