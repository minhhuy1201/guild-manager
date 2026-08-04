/**
 * Luật hạn chót điểm danh gợi ý cho một trận.
 *
 * Đây chỉ là GIÁ TRỊ MẶC ĐỊNH điền sẵn vào form — quản trị viên sửa được và
 * backend lưu đúng giá trị cuối cùng, không kẹp lại theo luật này.
 *
 * Mọi mốc giờ tính theo giờ Việt Nam (UTC+7) cố định, không phụ thuộc timezone
 * của máy đang chạy.
 */

/** Lệch múi giờ Việt Nam so với UTC (UTC+7, không có DST). */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Thứ 5 theo chuẩn ISO (Thứ 2 = 1 ... Chủ nhật = 7). */
const THURSDAY = 4;

/** Giờ chốt sổ cả tuần: 17:00 Thứ 5. */
const WEEK_CUTOFF_HOUR = 17;

/** Giờ chốt riêng của các trận diễn ra trước Thứ 5. */
const EARLY_SESSION_DEADLINE_HOUR = 10;

/**
 * Thứ trong tuần theo chuẩn ISO, tính theo giờ Việt Nam.
 * @param date - Thời điểm cần xét
 * @returns 1 = Thứ 2 ... 7 = Chủ nhật
 */
function vnIsoWeekday(date: Date): number {
  const day = new Date(date.getTime() + VN_OFFSET_MS).getUTCDay();

  return day === 0 ? 7 : day;
}

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
 * Hạn chót gợi ý cho một trận: 10:00 sáng chính ngày đánh nếu trận diễn ra
 * trước Thứ 5, ngược lại là 17:00 Thứ 5 của tuần chứa trận đó.
 * @param dateTime - Thời điểm diễn ra trận đánh
 * @returns Hạn chót gợi ý
 */
export function defaultDeadline(dateTime: Date): Date {
  const weekday = vnIsoWeekday(dateTime);

  if (weekday < THURSDAY) {
    return shiftVnDate(dateTime, 0, EARLY_SESSION_DEADLINE_HOUR, 0);
  }

  return shiftVnDate(dateTime, THURSDAY - weekday, WEEK_CUTOFF_HOUR, 0);
}
