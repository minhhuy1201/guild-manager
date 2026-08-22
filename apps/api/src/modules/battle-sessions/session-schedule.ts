/**
 * Luật thời gian của lịch đánh — tóm tắt ở docs/architecture.md mục 6.
 *
 * Mọi mốc giờ tính theo giờ Việt Nam (UTC+7) cố định, không phụ thuộc giờ máy
 * chạy server. Tuần điểm danh mở lúc 22:00 Thứ 7 cho tuần kế tiếp.
 *
 * Từ 2026-08 lịch đánh do quản trị viên nhập vào database; file này chỉ còn giữ
 * mốc tuần, trận Guild War cố định và cách dựng nhãn hiển thị.
 */
import { shiftVnDate, vnParts, vnWeekday } from '@guild/shared/lib';
import { INVALID_WEEK_MESSAGE } from '@guild/shared/schemas';
import { BadRequestException } from '@nestjs/common';

/** Thứ trong tuần theo chuẩn ISO của `vnWeekday()`: 1=T2, ..., 7=CN. */
const MONDAY = 1;
const SATURDAY = 6;

/** Giờ mở tuần điểm danh mới (22:00 Thứ 7). */
const WEEK_OPEN_HOUR = 22;

/** Lệch ngày của Thứ 7 so với Thứ 2 đầu tuần. */
const SATURDAY_OFFSET_FROM_MONDAY = 5;

/** Giờ đánh cố định của Guild War. */
const GUILD_WAR_HOUR = 20;
const GUILD_WAR_MINUTE = 0;

/** Tên thứ tra thẳng bằng `vnWeekday()`; chỉ số 0 bỏ trống vì ISO đếm từ 1. */
const WEEKDAY_NAMES = [
  '',
  'Thứ 2',
  'Thứ 3',
  'Thứ 4',
  'Thứ 5',
  'Thứ 6',
  'Thứ 7',
  'Chủ nhật',
];

/**
 * Mốc Thứ 2 00:00 giờ VN của một tuần điểm danh.
 *
 * Nhãn `__weekAnchor` chỉ tồn tại lúc biên dịch: một `Date` bất kỳ không gán được
 * vào đây, nên không ai lỡ truyền giờ đánh của một trận vào chỗ đợi mốc tuần.
 * Chỉ dựng được qua `weekStartOf` hoặc `parseWeekStart`.
 */
export type WeekAnchor = Date & { readonly __weekAnchor: unique symbol };

/** Một tuần điểm danh: mốc đầu và cuối. */
export interface ScheduledWeek {
  /** Thứ 2 00:00 — cũng là khóa gom trận theo tuần trong database. */
  weekStart: WeekAnchor;
  /** Thứ 7 23:59 — mốc cuối để hiển thị timeline. */
  weekEnd: Date;
}

/**
 * Quy một thời điểm về Thứ 2 00:00 (giờ VN) của tuần chứa nó.
 * @param dateTime - Thời điểm bất kỳ
 * @returns Mốc Thứ 2 00:00 của tuần chứa `dateTime`
 */
export function weekStartOf(dateTime: Date): WeekAnchor {
  return shiftVnDate(
    dateTime,
    -(vnWeekday(dateTime) - MONDAY),
    0,
    0,
  ) as WeekAnchor;
}

/**
 * Hai mốc tuần có chỉ cùng một tuần không.
 * So bằng thời điểm chứ không bằng chuỗi: cùng một mốc viết ở hai múi giờ khác
 * nhau vẫn phải cho `true`.
 * @param a - Mốc tuần thứ nhất
 * @param b - Mốc tuần thứ hai
 * @returns true nếu hai mốc trỏ cùng một tuần
 */
export function isSameWeek(a: WeekAnchor, b: WeekAnchor): boolean {
  return a.getTime() === b.getTime();
}

/**
 * Dựng một tuần điểm danh từ mốc Thứ 2 của nó.
 * @param weekStart - Thứ 2 00:00 giờ VN
 * @returns Tuần kèm mốc cuối Thứ 7 23:59
 */
function toWeek(weekStart: WeekAnchor): ScheduledWeek {
  return { weekStart, weekEnd: weekEndOf(weekStart) };
}

/**
 * Mốc cuối tuần điểm danh (Thứ 7 23:59 giờ VN) của một tuần.
 * @param weekStart - Thứ 2 00:00 giờ VN
 * @returns Mốc Thứ 7 23:59 của cùng tuần
 */
export function weekEndOf(weekStart: Date): Date {
  return shiftVnDate(weekStart, SATURDAY_OFFSET_FROM_MONDAY, 23, 59);
}

/**
 * Xác định tuần điểm danh đang mở tại thời điểm `now`.
 * Tuần mở lúc 22:00 Thứ 7 và mở cho tuần KẾ TIẾP.
 * @param now - Thời điểm hiện tại
 * @returns Tuần đang mở
 */
export function getActiveWeek(now: Date): ScheduledWeek {
  // Chủ nhật (ISO 7) đồng dư 0 mod 7 nên vẫn ra 1 ngày kể từ Thứ 7.
  const daysSinceSaturday = (vnWeekday(now) - SATURDAY + 7) % 7;

  let anchorOpen = shiftVnDate(now, -daysSinceSaturday, WEEK_OPEN_HOUR, 0);

  // Mốc mở 22:00 Thứ 7 còn ở tương lai → tuần đang mở được mở từ Thứ 7 tuần trước.
  if (anchorOpen.getTime() > now.getTime()) {
    anchorOpen = shiftVnDate(anchorOpen, -7, WEEK_OPEN_HOUR, 0);
  }

  // Thứ 7 mở tuần + 2 ngày = Thứ 2 đầu tuần mới.
  return toWeek(weekStartOf(shiftVnDate(anchorOpen, 2, 0, 0)));
}

/**
 * Đọc một mốc tuần từ query string — chỗ duy nhất biến chuỗi client gửi lên
 * thành mốc tuần.
 *
 * Chuỗi hợp lệ nhưng rơi vào giữa tuần thì quy về Thứ 2 của tuần chứa nó chứ
 * không ném: client gửi giữa tuần thì ý định rõ ràng là "tuần chứa ngày này", và
 * trả đúng tuần đó không hề âm thầm sai.
 * @param input - Chuỗi ISO client gửi lên; bỏ trống = tuần đang mở
 * @param now - Thời điểm hiện tại, dùng khi `input` bỏ trống
 * @returns Mốc Thứ 2 00:00 giờ VN
 * @throws BadRequestException khi chuỗi không phải một mốc thời gian hợp lệ
 */
export function parseWeekStart(
  input: string | undefined,
  now: Date,
): WeekAnchor {
  if (input === undefined) return getActiveWeek(now).weekStart;

  const parsed = new Date(input);

  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(INVALID_WEEK_MESSAGE);
  }

  return weekStartOf(parsed);
}

/**
 * Các tuần quản trị viên được phép thiết lập lịch: tuần đang mở và tuần kế tiếp.
 * Tuần đã qua chỉ đọc.
 * @param now - Thời điểm hiện tại
 * @returns Mảng 2 tuần, tuần đang mở đứng trước
 */
export function getEditableWeeks(now: Date): ScheduledWeek[] {
  const active = getActiveWeek(now);

  return [active, toWeek(weekStartOf(shiftVnDate(active.weekStart, 7, 0, 0)))];
}

/**
 * Thời điểm diễn ra Guild War của một tuần: 20:00 Thứ 7.
 * @param weekStart - Thứ 2 00:00 của tuần
 * @returns Thời điểm đánh Guild War
 */
export function guildWarDateTime(weekStart: Date): Date {
  return shiftVnDate(
    weekStart,
    SATURDAY_OFFSET_FROM_MONDAY,
    GUILD_WAR_HOUR,
    GUILD_WAR_MINUTE,
  );
}

/**
 * Id tất định của trận Guild War một tuần.
 * Không còn ràng buộc unique theo nhãn nên id chính là khóa để upsert idempotent.
 * @param weekStart - Thứ 2 00:00 của tuần
 * @returns Id dạng `gw-YYYY-MM-DD` theo ngày Thứ 2 giờ VN
 */
export function guildWarSessionId(weekStart: Date): string {
  const { year, month, day } = vnParts(weekStart);

  return `gw-${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Dựng nhãn hiển thị của một trận từ giờ đánh — nhãn KHÔNG lưu trong database
 * nên đổi giờ đánh là nhãn tự đúng theo.
 * @param dateTime - Thời điểm đánh
 * @param isGuildWar - Có phải trận Guild War không
 * @returns Nhãn dạng "Thứ 3 · 20:30" hoặc "Thứ 7 · Guild War"
 */
export function formatSessionLabel(
  dateTime: Date,
  isGuildWar: boolean,
): string {
  const weekday = WEEKDAY_NAMES[vnWeekday(dateTime)];

  if (isGuildWar) return `${weekday} · Guild War`;

  const { hour, minute } = vnParts(dateTime);

  return `${weekday} · ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * Kiểm tra đã quá hạn điểm danh hay chưa.
 * @param deadline - Hạn chót của trận
 * @param now - Thời điểm hiện tại
 * @returns true nếu đã quá hạn, không cho ghi nhận điểm danh nữa
 */
export function isDeadlinePassed(deadline: Date, now: Date): boolean {
  return now.getTime() > deadline.getTime();
}

/**
 * Trận đã qua giờ đánh thì khoá, không sửa đội hình được nữa.
 * Khác `isDeadlinePassed` ở mốc so: hạn điểm danh là một thời điểm riêng trước giờ đánh, còn
 * đây so thẳng với chính giờ đánh. Đúng giờ đánh vẫn chưa khoá.
 * @param dateTime - Thời điểm đánh của trận
 * @param now - Thời điểm hiện tại
 * @returns true khi trận đã đánh xong
 */
export function isSessionLocked(dateTime: Date, now: Date): boolean {
  return dateTime.getTime() < now.getTime();
}
