/** The sentence used when the backend sends an error code not in the table. */
const FALLBACK = "Không đăng nhập được, vui lòng thử lại.";

/**
 * Codes the web app puts on `?error=` itself, for a redirect it decided on its own.
 * Separate from `AUTH_ERROR` on the API because no request ever carries these - they are the answer
 * to "why am I suddenly on a different page".
 */
export const WEB_AUTH_ERROR = {
  /** An admin-only page was opened by someone who is not (or is no longer) an admin */
  adminOnly: "khong-du-quyen",
} as const;

/**
 * The Vietnamese sentence for each error code that can appear on `?error=`.
 * The backend's codes must match `AUTH_ERROR` in `apps/api/src/modules/auth/auth.constant.ts`; the
 * web app's own are in `WEB_AUTH_ERROR` above.
 */
const MESSAGES: Record<string, string> = {
  "tu-choi": "Bạn đã huỷ đăng nhập bằng Discord.",
  "khong-thuoc-bang":
    "Tài khoản Discord này chưa được gán cho thành viên nào trong bang. Liên hệ quản trị viên.",
  "phien-het-han": "Phiên đăng nhập đã hết hạn, vui lòng thử lại.",
  "discord-loi": "Không kết nối được Discord, vui lòng thử lại sau.",
  [WEB_AUTH_ERROR.adminOnly]:
    "Trang đó chỉ dành cho quản trị viên. Nếu bạn vừa bị đổi quyền, hãy liên hệ quản trị viên.",
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
