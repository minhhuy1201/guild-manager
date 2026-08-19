/**
 * Đồng hồ giờ Việt Nam — nguyên thủy thời gian dùng chung, không biết gì về
 * trận đánh.
 *
 * Việt Nam là UTC+7 cố định, không có DST, nên offset là một hằng số chứ không
 * cần timezone database.
 *
 * Quy ước duy nhất của module: mọi hàm NHẬN và TRẢ `Date` là mốc UTC thật,
 * không phải "giờ VN đã cộng sẵn". Chỉ phần *đọc* các thành phần lịch (thứ,
 * ngày, giờ) mới diễn giải theo giờ VN.
 */

/** Lệch múi giờ Việt Nam so với UTC (UTC+7, không có DST). */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Các thành phần lịch của một mốc, đã đọc theo giờ VN. */
export interface VnParts {
  year: number;
  /** 1-12, không phải 0-11 như `Date.getUTCMonth()`. */
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/**
 * Dời một mốc UTC sang "đồng hồ VN" để đọc thành phần lịch bằng `getUTC*()`.
 * @param date - Mốc UTC thật
 * @returns Date chỉ dùng để đọc, KHÔNG phải mốc thời gian hợp lệ
 */
function toVnClock(date: Date): Date {
  return new Date(date.getTime() + VN_OFFSET_MS);
}

/**
 * Thứ trong tuần theo giờ VN, chuẩn ISO.
 * @param date - Mốc UTC thật
 * @returns 1 = Thứ 2, …, 7 = Chủ nhật
 */
export function vnWeekday(date: Date): number {
  const day = toVnClock(date).getUTCDay();

  // getUTCDay() xếp Chủ nhật = 0; ISO xếp Chủ nhật = 7.
  return day === 0 ? 7 : day;
}

/**
 * Các thành phần lịch của một mốc, đọc theo giờ VN.
 * @param date - Mốc UTC thật
 * @returns Năm, tháng (1-12), ngày, giờ, phút theo giờ VN
 */
export function vnParts(date: Date): VnParts {
  const vn = toVnClock(date);

  return {
    year: vn.getUTCFullYear(),
    month: vn.getUTCMonth() + 1,
    day: vn.getUTCDate(),
    hour: vn.getUTCHours(),
    minute: vn.getUTCMinutes(),
  };
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
  const vn = toVnClock(base);
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
 * Đặt một mốc về giờ/phút cụ thể trong chính ngày VN của nó.
 * @param base - Mốc gốc (thời điểm UTC thật)
 * @param hour - Giờ VN cần đặt (0-23)
 * @param minute - Phút cần đặt (0-59)
 * @returns Date UTC tương ứng với mốc giờ VN yêu cầu
 */
export function atVnTime(base: Date, hour: number, minute: number): Date {
  return shiftVnDate(base, 0, hour, minute);
}
