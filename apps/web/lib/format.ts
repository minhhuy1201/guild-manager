/**
 * Format a date as dd/MM/yyyy in Vietnamese.
 * @param iso - ISO date string
 * @returns The formatted date
 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Format a date as dd/MM. Built by hand because the Vietnamese Intl locale returns "08-08" when the
 * year is dropped, while the UI always uses slashes.
 * @param iso - ISO date string
 * @returns The date as dd/MM
 */
export function formatDayMonth(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}

/**
 * Format a time as HH:mm in Vietnamese.
 * @param iso - ISO date string
 * @returns The formatted time
 */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format a date and time as dd/MM/yyyy HH:mm in Vietnamese.
 * @param iso - ISO date string
 * @returns The formatted date and time
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
