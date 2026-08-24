/** Số chữ cái tối đa trong ảnh dự phòng — nhiều hơn là tràn khỏi vòng tròn 32px. */
const MAX_INITIALS = 2;

/**
 * Rút chữ cái đầu của tên để làm ảnh dự phòng khi không tải được avatar.
 * @param label - Tên nhân vật hoặc tên Discord, null khi chưa đọc được
 * @returns Tối đa hai chữ cái viết hoa, hoặc "?" khi không có tên nào
 */
export function accountInitials(label: string | null): string {
  const words = label?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (words.length === 0) return "?";

  return words
    .slice(0, MAX_INITIALS)
    .map((word) => word[0].toUpperCase())
    .join("");
}
