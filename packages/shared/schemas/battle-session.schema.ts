import { z } from "zod";

import { isWithinDeadlineCap } from "../lib/battle-session";

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

/** Thông báo khi hạn chót vượt trần — API và form dùng chung một câu chữ. */
export const DEADLINE_CAP_MESSAGE =
  "Hạn chót điểm danh không được muộn hơn 10:00 sáng ngày đánh.";

/**
 * Thông báo khi mốc tuần trên query string không đọc được.
 *
 * Người đọc duy nhất là `weekStartQuerySchema` ngay dưới đây — tầng duy nhất
 * dựng câu tiếng Việt và status 400 cho `?weekStart=`. Vẫn tách thành hằng để
 * web import được khi cần hiện lại đúng câu chữ, giống `DEADLINE_CAP_MESSAGE`.
 */
export const INVALID_WEEK_MESSAGE = "Tuần không hợp lệ.";

/**
 * Query string của các endpoint đọc theo tuần (`?weekStart=`).
 *
 * `offset: true` vì client hợp lệ được gửi `+07:00` chứ không chỉ `Z`.
 * `preprocess` đổi chuỗi rỗng thành `undefined`: `?weekStart=` là một thứ vô hại,
 * nó phải cư xử như bỏ trống chứ không thành 400.
 *
 * Zod chỉ trả lời "có phải một mốc thời gian không"; "mốc đó thuộc tuần nào" là
 * luật tuần, do `parseWeekStart` ở apps/api quyết định.
 */
export const weekStartQuerySchema = z.object({
  weekStart: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.iso.datetime({ offset: true, error: INVALID_WEEK_MESSAGE }).optional()
  ),
});

/** Kiểu query string đọc theo tuần đã validate. */
export type WeekStartQuery = z.infer<typeof weekStartQuerySchema>;

/** Các field của một trận, chưa gắn luật cross-field. */
const battleSessionFields = z.object({
  /** Thời điểm diễn ra trận đánh (ISO string) */
  dateTime: isoDateTime,
  /** Hạn chót điểm danh do quản trị viên đặt, tối đa 10:00 ngày đánh (ISO string) */
  deadline: isoDateTime,
  opponent,
});

/**
 * Body của POST /battle-sessions.
 * Dùng chung: FE validate form, BE validate request body (nestjs-zod).
 */
export const createBattleSessionSchema = battleSessionFields.refine(
  ({ dateTime, deadline }) =>
    isWithinDeadlineCap(new Date(deadline), new Date(dateTime)),
  { path: ["deadline"], message: DEADLINE_CAP_MESSAGE }
);

/**
 * Body của PATCH /battle-sessions/:id — sửa được từng phần.
 * Không gắn luật trần ở đây: PATCH có thể chỉ gửi một trong hai field nên schema
 * không đủ dữ liệu để kết luận. Service phán quyết trên cặp đã trộn với hàng cũ.
 */
export const updateBattleSessionSchema = battleSessionFields.partial();

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
  /** Đã quá hạn điểm danh tại thời điểm server dựng response. */
  isDeadlinePassed: z.boolean(),
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
