/**
 * Luật hạn chót điểm danh của một trận.
 *
 * Trần hạn chót là RÀNG BUỘC CỨNG, không phải gợi ý: backend từ chối request vi
 * phạm thay vì kẹp lại giá trị, nên form và backend phải dùng chung phép tính ở
 * đây.
 *
 * Mọi mốc giờ tính theo giờ Việt Nam (UTC+7) cố định, không phụ thuộc timezone
 * của máy đang chạy.
 */

/** Lệch múi giờ Việt Nam so với UTC (UTC+7, không có DST). */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Giờ muộn nhất được phép đặt hạn chót, tính trong chính ngày đánh. */
const DEADLINE_CAP_HOUR = 10;

/** Giờ chốt cố định của trận Guild War. */
const GUILD_WAR_DEADLINE_HOUR = 17;

/** Lệch ngày của Thứ 5 so với Thứ 2 đầu tuần. */
const THURSDAY_OFFSET_FROM_MONDAY = 3;

/**
 * Dịch một mốc thời gian đi `deltaDays` ngày rồi đặt về giờ/phút cụ thể theo giờ VN.
 * @param base - Mốc gốc (thời điểm UTC thật)
 * @param deltaDays - Số ngày cộng thêm (âm = lùi về trước)
 * @param hour - Giờ VN cần đặt (0-23)
 * @param minute - Phút cần đặt (0-59)
 * @returns Date UTC tương ứng với mốc giờ VN yêu cầu
 */
export function shiftVnDate(
  base: Date,
  deltaDays: number,
  hour: number,
  minute: number
): Date {
  const vn = new Date(base.getTime() + VN_OFFSET_MS);
  const shifted = Date.UTC(
    vn.getUTCFullYear(),
    vn.getUTCMonth(),
    vn.getUTCDate() + deltaDays,
    hour,
    minute
  );

  return new Date(shifted - VN_OFFSET_MS);
}

/**
 * Hạn chót muộn nhất được phép của một trận scrim: 10:00 sáng giờ VN của chính
 * ngày đánh, và không bao giờ muộn hơn giờ đánh (trận trước 10:00 thì trần
 * chính là giờ đánh).
 *
 * Đây vừa là trần backend kiểm tra, vừa là giá trị điền sẵn cho form — muộn
 * nhất có thể cũng là lựa chọn hợp lý nhất trong đa số trường hợp.
 * @param dateTime - Thời điểm diễn ra trận đánh
 * @returns Hạn chót muộn nhất được phép
 */
export function deadlineCapFor(dateTime: Date): Date {
  const morning = shiftVnDate(dateTime, 0, DEADLINE_CAP_HOUR, 0);

  return morning.getTime() < dateTime.getTime() ? morning : dateTime;
}

/**
 * Hạn chót có nằm trong trần cho phép không — luật kiểm tra duy nhất, dùng
 * chung cho schema, service và form.
 * @param deadline - Hạn chót cần xét
 * @param dateTime - Giờ đánh của trận
 * @returns true nếu hợp lệ (đúng bằng trần vẫn hợp lệ)
 */
export function isWithinDeadlineCap(deadline: Date, dateTime: Date): boolean {
  return deadline.getTime() <= deadlineCapFor(dateTime).getTime();
}

/**
 * Hạn chót cố định của trận Guild War một tuần: 17:00 Thứ 5 của tuần đó.
 * Giá trị này do hệ thống sở hữu, quản trị viên không sửa được.
 * @param weekStart - Mốc Thứ 2 00:00 giờ VN của tuần chứa trận
 * @returns Hạn chót 17:00 Thứ 5 cùng tuần
 */
export function guildWarDeadline(weekStart: Date): Date {
  return shiftVnDate(
    weekStart,
    THURSDAY_OFFSET_FROM_MONDAY,
    GUILD_WAR_DEADLINE_HOUR,
    0
  );
}
