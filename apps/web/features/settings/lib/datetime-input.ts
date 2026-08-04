/**
 * `<input type="datetime-local">` nhận và trả chuỗi "YYYY-MM-DDTHH:mm" theo giờ
 * máy người dùng, còn API dùng ISO UTC. Hai hàm này là chỗ duy nhất đổi qua lại.
 */

/**
 * Đổi ISO string sang giá trị cho input datetime-local.
 * @param iso - Thời điểm dạng ISO string
 * @returns Chuỗi "YYYY-MM-DDTHH:mm" theo giờ máy
 */
export function toInputValue(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");

  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
  ].join("");
}

/**
 * Đổi giá trị của input datetime-local thành ISO string gửi lên API.
 * @param value - Chuỗi "YYYY-MM-DDTHH:mm" theo giờ máy
 * @returns Thời điểm dạng ISO string
 */
export function fromInputValue(value: string): string {
  return new Date(value).toISOString();
}
