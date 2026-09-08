import { WEB_AUTH_ERROR } from "../core/auth-error";

/** The sentence used when the backend sends an error code not in the table. */
const FALLBACK = "Không đăng nhập được, vui lòng thử lại.";

/**
 * The Vietnamese sentence for each error code that can appear on `?error=`.
 * The backend's codes must match `AUTH_ERROR` in `apps/api/src/modules/auth/auth.constant.ts`; the
 * web app's own live in `core/auth-error.ts`.
 */
const MESSAGES: Record<string, string> = {
  "tu-choi": "Bạn đã huỷ đăng nhập bằng Discord.",
  "khong-thuoc-bang":
    "Tài khoản Discord này chưa được gán cho thành viên nào trong bang. Liên hệ quản trị viên.",
  "phien-het-han": "Phiên đăng nhập đã hết hạn, vui lòng thử lại.",
  "discord-loi": "Không kết nối được Discord, vui lòng thử lại sau.",
  [WEB_AUTH_ERROR.adminOnly]:
    "Trang đó chỉ dành cho quản trị viên. Nếu bạn vừa bị đổi quyền, hãy liên hệ quản trị viên.",
  [WEB_AUTH_ERROR.sessionInvalid]:
    "Phiên đăng nhập không hợp lệ. Hãy đăng nhập lại — nếu vẫn không vào được, cấu hình máy chủ có thể đang sai, hãy báo quản trị viên.",
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
