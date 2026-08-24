/** Câu dùng khi backend gửi một mã lỗi không nằm trong bảng. */
const FALLBACK = "Không đăng nhập được, vui lòng thử lại.";

/**
 * Câu tiếng Việt cho từng mã lỗi backend gắn vào `?error=`.
 * Mã phải khớp `AUTH_ERROR` ở `apps/api/src/modules/auth/auth.constant.ts`.
 */
const MESSAGES: Record<string, string> = {
  "tu-choi": "Bạn đã huỷ đăng nhập bằng Discord.",
  "khong-thuoc-bang":
    "Tài khoản Discord này chưa được gán cho thành viên nào trong bang. Liên hệ quản trị viên.",
  "phien-het-han": "Phiên đăng nhập đã hết hạn, vui lòng thử lại.",
  "discord-loi": "Không kết nối được Discord, vui lòng thử lại sau.",
};

/**
 * Dịch mã lỗi trên query string thành câu hiển thị.
 * @param code - Giá trị `?error=`, undefined khi không có
 * @returns Câu tiếng Việt, hoặc null khi không có lỗi nào để hiện
 */
export function loginErrorMessage(code: string | undefined): string | null {
  if (!code) return null;

  return MESSAGES[code] ?? FALLBACK;
}
