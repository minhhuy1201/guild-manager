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
