/** The sentence used when the backend sends an error code not in the table. */
const FALLBACK = "Không đăng nhập được, vui lòng thử lại.";

/**
 * The Vietnamese sentence for each error code the backend puts on `?error=`.
 * The codes must match `AUTH_ERROR` in `apps/api/src/modules/auth/auth.constant.ts`.
 */
const MESSAGES: Record<string, string> = {
  "tu-choi": "Bạn đã huỷ đăng nhập bằng Discord.",
  "khong-thuoc-bang":
    "Tài khoản Discord này chưa được gán cho thành viên nào trong bang. Liên hệ quản trị viên.",
  "phien-het-han": "Phiên đăng nhập đã hết hạn, vui lòng thử lại.",
  "discord-loi": "Không kết nối được Discord, vui lòng thử lại sau.",
};

/**
 * Translate the query string's error code into a displayable sentence.
 * @param code - The `?error=` value, undefined when absent
 * @returns The sentence, or null when there is no error to show
 */
export function loginErrorMessage(code: string | undefined): string | null {
  if (!code) return null;

  return MESSAGES[code] ?? FALLBACK;
}
