/**
 * Trình duyệt hiển thị `<input type="datetime-local">` theo locale của chính nó,
 * nên máy đặt tiếng Anh sẽ ra mm/dd/yyyy. Form dùng ô text riêng cho ngày và giờ
 * để luôn là dd/MM/yyyy và HH:mm; đây là chỗ đổi qua lại với chuỗi local
 * "YYYY-MM-DDTHH:mm" mà [[datetime-input]] dùng.
 */

const DATE_DIGITS = 8;
const TIME_DIGITS = 4;
const MONTHS_IN_YEAR = 12;
const HOURS_IN_DAY = 24;
const MINUTES_IN_HOUR = 60;

const DISPLAY_DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const DISPLAY_TIME = /^(\d{2}):(\d{2})$/;

/**
 * Số ngày của một tháng, có tính năm nhuận.
 * @param year - Năm dương lịch
 * @param month - Tháng từ 1 đến 12
 * @returns Số ngày của tháng đó
 */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Tách chuỗi local thành hai ô hiển thị.
 * @param value - Chuỗi "YYYY-MM-DDTHH:mm", rỗng nếu chưa chọn
 * @param defaultTime - Giờ điền sẵn khi chưa có giá trị, dạng HH:mm
 * @returns Ngày dạng dd/MM/yyyy và giờ dạng HH:mm
 */
export function splitLocalValue(
  value: string,
  defaultTime = ""
): { date: string; time: string } {
  const [datePart, timePart] = value.split("T");

  if (!datePart || !timePart) return { date: "", time: defaultTime };

  const [year, month, day] = datePart.split("-");

  return { date: `${day}/${month}/${year}`, time: timePart };
}

/**
 * Ghép hai ô hiển thị thành chuỗi local.
 * @param date - Ngày dạng dd/MM/yyyy
 * @param time - Giờ dạng HH:mm
 * @returns Chuỗi "YYYY-MM-DDTHH:mm", rỗng nếu ngày giờ chưa hợp lệ
 */
export function joinLocalValue(date: string, time: string): string {
  const dateMatch = DISPLAY_DATE.exec(date);
  const timeMatch = DISPLAY_TIME.exec(time);

  if (!dateMatch || !timeMatch) return "";

  const [, day, month, year] = dateMatch;
  const [, hour, minute] = timeMatch;

  if (Number(month) < 1 || Number(month) > MONTHS_IN_YEAR) return "";
  if (Number(day) < 1 || Number(day) > daysInMonth(Number(year), Number(month)))
    return "";
  if (Number(hour) >= HOURS_IN_DAY || Number(minute) >= MINUTES_IN_HOUR)
    return "";

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/**
 * Đổi một `Date` thành chuỗi hiển thị của ô ngày.
 * @param date - Ngày cần hiển thị
 * @returns Chuỗi dd/MM/yyyy theo giờ máy
 */
export function toDisplayDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${pad(date.getDate())}/${pad(
    date.getMonth() + 1
  )}/${date.getFullYear()}`;
}

/**
 * Đổi chuỗi trong ô ngày thành `Date` để calendar tô sáng đúng ngày.
 * @param date - Chuỗi dd/MM/yyyy
 * @returns `Date` lúc 0h, hoặc undefined nếu ngày chưa hợp lệ
 */
export function parseDisplayDate(date: string): Date | undefined {
  const joined = joinLocalValue(date, "00:00");

  if (!joined) return undefined;

  const [year, month, day] = joined.slice(0, 10).split("-").map(Number);

  return new Date(year, month - 1, day);
}

/**
 * Chèn dấu phân cách vào chuỗi người dùng đang gõ.
 * @param raw - Chuỗi thô trong ô nhập
 * @param separator - Dấu ngăn giữa các nhóm
 * @param groups - Độ dài từng nhóm số
 * @returns Chuỗi đã chèn dấu, cắt bỏ phần thừa
 */
function mask(raw: string, separator: string, groups: number[]): string {
  const digits = raw.replace(/\D/g, "").slice(0, sum(groups));
  const parts: string[] = [];
  let cursor = 0;

  for (const size of groups) {
    if (cursor >= digits.length) break;

    parts.push(digits.slice(cursor, cursor + size));
    cursor += size;
  }

  return parts.join(separator);
}

/**
 * Tổng của một dãy số.
 * @param values - Dãy số cần cộng
 * @returns Tổng các phần tử
 */
function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/**
 * Định dạng dần chuỗi ngày người dùng đang gõ thành dd/MM/yyyy.
 * @param raw - Chuỗi thô trong ô nhập
 * @returns Chuỗi ngày đã chèn dấu /
 */
export function maskDate(raw: string): string {
  return mask(raw, "/", [2, 2, DATE_DIGITS - 4]);
}

/**
 * Định dạng dần chuỗi giờ người dùng đang gõ thành HH:mm.
 * @param raw - Chuỗi thô trong ô nhập
 * @returns Chuỗi giờ đã chèn dấu :
 */
export function maskTime(raw: string): string {
  return mask(raw, ":", [2, TIME_DIGITS - 2]);
}
