import type { GuildRole } from "@guild/shared/enums";
import { canManageGuild } from "@guild/shared/lib";

import { ROUTES } from "@/config/routes";

/** Các route công khai duy nhất — mọi trang khác đều cần phiên đăng nhập. */
const PUBLIC_PATH_PREFIXES = [ROUTES.login];

/** Các route chỉ dành cho quản trị viên. */
const ADMIN_PATH_PREFIXES = [ROUTES.teamBuilder, ROUTES.settings];

/** Kết luận cho một request trang. */
export type AccessDecision =
  /** Cho đi tiếp */
  | "allow"
  /** Đá về trang đăng nhập (kèm redirect quay lại) */
  | "login"
  /** Đã đăng nhập nhưng không đủ quyền — đá về trang điểm danh */
  | "home";

/**
 * Quyết định một request trang được đi tiếp hay bị đá đi đâu.
 *
 * Tách khỏi `proxy.ts` để test được mà không phải dựng NextRequest: proxy chỉ còn việc đọc cookie
 * và dịch kết luận này thành response.
 * @param input.pathname - Đường dẫn đang vào
 * @param input.role - Vai đọc từ access token, null khi chưa đăng nhập
 * @returns Kết luận cho request
 */
export function decideAccess({
  pathname,
  role,
}: {
  pathname: string;
  role: GuildRole | null;
}): AccessDecision {
  const isPublic = PUBLIC_PATH_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  if (isPublic) return "allow";
  if (!role) return "login";

  const isAdminPath = ADMIN_PATH_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  return isAdminPath && !canManageGuild(role) ? "home" : "allow";
}
