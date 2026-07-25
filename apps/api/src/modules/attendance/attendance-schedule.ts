/**
 * Luật thời gian của tính năng điểm danh — xem apps/web/docs/attendance-time-rules.md.
 *
 * Mọi mốc giờ tính theo giờ Việt Nam (UTC+7) cố định, không phụ thuộc giờ máy chạy server:
 * - Tuần điểm danh mở lúc 22:00 Thứ 7 (mở cho Guild War của Thứ 7 kế tiếp).
 * - Trận trước Thứ 5 (Thứ 2/3/4): hạn điểm danh = 10:00 sáng chính ngày đánh.
 * - Chốt sổ toàn tuần lúc 17:00 Thứ 5 — trần cứng cho MỌI trận, kể cả Guild War Thứ 7.
 */

/** Lệch múi giờ Việt Nam so với UTC (UTC+7, không có DST). */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Thứ 7 theo `Date.getUTCDay()`: 0=CN, 1=T2, ..., 6=T7. */
const SATURDAY = 6;

/** Giờ chốt sổ cả tuần (17:00 Thứ 5) và giờ mở tuần mới (22:00 Thứ 7). */
const WEEK_CUTOFF_HOUR = 17;
const WEEK_OPEN_HOUR = 22;

/** Lệch ngày của Thứ 5 so với Thứ 7 — dùng để tính trần chốt sổ. */
const THURSDAY_OFFSET_FROM_SATURDAY = -2;

/** Giờ chốt riêng của các trận diễn ra trước Thứ 5. */
const EARLY_SESSION_DEADLINE_HOUR = 10;

/** Cấu hình một trận trong tuần: lệch bao nhiêu ngày so với Thứ 7 + giờ đánh. */
interface SessionTemplate {
  /** Nhãn hiển thị, đồng thời là khóa nhận dạng trận trong một tuần. */
  label: string;
  /** 0 = Thứ 7, -2 = Thứ 5, -4 = Thứ 3... (âm = sớm hơn trong tuần). */
  dayOffsetFromSaturday: number;
  hour: number;
  minute: number;
  isGuildWar: boolean;
}

/** Các trận cố định trong tuần — muốn đổi lịch đánh thì sửa ở đây. */
const SESSION_TEMPLATES: SessionTemplate[] = [
  {
    label: 'Thứ 3 · 20:30',
    dayOffsetFromSaturday: -4,
    hour: 20,
    minute: 30,
    isGuildWar: false,
  },
  {
    label: 'Thứ 5 · 20:30',
    dayOffsetFromSaturday: -2,
    hour: 20,
    minute: 30,
    isGuildWar: false,
  },
  {
    label: 'Thứ 7 · Guild War',
    dayOffsetFromSaturday: 0,
    hour: 20,
    minute: 0,
    isGuildWar: true,
  },
];

/** Một trận đã tính xong thời điểm đánh và hạn điểm danh hiệu dụng. */
export interface ScheduledSession {
  label: string;
  dateTime: Date;
  deadline: Date;
  isGuildWar: boolean;
}

/** Tuần điểm danh đang mở. */
export interface ScheduledWeek {
  /** Thứ 2 00:00 — cũng là khóa gom trận theo tuần trong database. */
  weekStart: Date;
  /** Thứ 7 23:59 — mốc cuối để hiển thị timeline. */
  weekEnd: Date;
  sessions: ScheduledSession[];
}

/**
 * Dịch một mốc thời gian đi `deltaDays` ngày rồi đặt về giờ/phút cụ thể theo giờ VN.
 * @param base - Mốc gốc (thời điểm UTC thật)
 * @param deltaDays - Số ngày cộng thêm (âm = lùi về trước)
 * @param hour - Giờ VN cần đặt (0-23)
 * @param minute - Phút cần đặt (0-59)
 * @returns Date UTC tương ứng với mốc giờ VN yêu cầu
 */
function shiftVnDate(
  base: Date,
  deltaDays: number,
  hour: number,
  minute: number,
): Date {
  const vn = new Date(base.getTime() + VN_OFFSET_MS);
  const shifted = Date.UTC(
    vn.getUTCFullYear(),
    vn.getUTCMonth(),
    vn.getUTCDate() + deltaDays,
    hour,
    minute,
  );

  return new Date(shifted - VN_OFFSET_MS);
}

/**
 * Xác định Thứ 7 (Guild War) của tuần điểm danh đang mở tại thời điểm `now`.
 * Tuần mở lúc 22:00 Thứ 7 và mở cho Guild War của Thứ 7 KẾ TIẾP.
 * @param now - Thời điểm hiện tại
 * @returns Date đặt tại 00:00 giờ VN của Thứ 7 thuộc tuần đang mở
 */
function activeGuildWarSaturday(now: Date): Date {
  const vnDayOfWeek = new Date(now.getTime() + VN_OFFSET_MS).getUTCDay();
  const daysSinceSaturday = (vnDayOfWeek - SATURDAY + 7) % 7;

  let anchorOpen = shiftVnDate(now, -daysSinceSaturday, WEEK_OPEN_HOUR, 0);

  // Mốc mở 22:00 Thứ 7 còn ở tương lai → tuần đang mở được mở từ Thứ 7 tuần trước.
  if (anchorOpen.getTime() > now.getTime()) {
    anchorOpen = shiftVnDate(anchorOpen, -7, WEEK_OPEN_HOUR, 0);
  }

  return shiftVnDate(anchorOpen, 7, 0, 0);
}

/**
 * Tính tuần điểm danh đang mở kèm toàn bộ trận và hạn điểm danh hiệu dụng.
 * @param now - Thời điểm hiện tại (mặc định là bây giờ)
 * @returns Tuần đang mở: mốc đầu/cuối tuần và danh sách trận
 */
export function getActiveWeek(now: Date = new Date()): ScheduledWeek {
  const guildWarSaturday = activeGuildWarSaturday(now);
  // Trần cứng: chốt sổ toàn tuần lúc 17:00 Thứ 5.
  const weekCutoff = shiftVnDate(
    guildWarSaturday,
    THURSDAY_OFFSET_FROM_SATURDAY,
    WEEK_CUTOFF_HOUR,
    0,
  );

  const sessions = SESSION_TEMPLATES.map((template) => {
    const isBeforeThursday =
      template.dayOffsetFromSaturday < THURSDAY_OFFSET_FROM_SATURDAY;
    const ownDeadline = isBeforeThursday
      ? shiftVnDate(
          guildWarSaturday,
          template.dayOffsetFromSaturday,
          EARLY_SESSION_DEADLINE_HOUR,
          0,
        )
      : weekCutoff;

    return {
      label: template.label,
      dateTime: shiftVnDate(
        guildWarSaturday,
        template.dayOffsetFromSaturday,
        template.hour,
        template.minute,
      ),
      // Không bao giờ muộn hơn trần chốt sổ cả tuần.
      deadline:
        ownDeadline.getTime() < weekCutoff.getTime() ? ownDeadline : weekCutoff,
      isGuildWar: template.isGuildWar,
    };
  });

  return {
    weekStart: shiftVnDate(guildWarSaturday, -5, 0, 0),
    weekEnd: shiftVnDate(guildWarSaturday, 0, 23, 59),
    sessions,
  };
}

/**
 * Kiểm tra đã quá hạn điểm danh hay chưa.
 * @param deadline - Hạn chót của trận
 * @param now - Thời điểm hiện tại (mặc định là bây giờ)
 * @returns true nếu đã quá hạn, không cho ghi nhận điểm danh nữa
 */
export function isDeadlinePassed(
  deadline: Date,
  now: Date = new Date(),
): boolean {
  return now.getTime() > deadline.getTime();
}
