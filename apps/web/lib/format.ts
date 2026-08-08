/**
 * Định dạng ngày dạng dd/MM/yyyy theo tiếng Việt.
 * @param iso - Chuỗi ISO date
 * @returns Chuỗi ngày đã định dạng
 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Định dạng ngày dạng dd/MM. Tự ghép chuỗi vì Intl tiếng Việt trả về "08-08"
 * khi bỏ năm, trong khi giao diện luôn dùng dấu gạch chéo.
 * @param iso - Chuỗi ISO date
 * @returns Chuỗi ngày dạng dd/MM
 */
export function formatDayMonth(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}

/**
 * Định dạng giờ dạng HH:mm theo tiếng Việt.
 * @param iso - Chuỗi ISO date
 * @returns Chuỗi giờ đã định dạng
 */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Định dạng ngày giờ dạng dd/MM/yyyy HH:mm theo tiếng Việt.
 * @param iso - Chuỗi ISO date
 * @returns Chuỗi ngày giờ đã định dạng
 */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
