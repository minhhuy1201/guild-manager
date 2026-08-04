import { NextResponse, type NextRequest } from "next/server";

import { refreshRequest } from "@/features/auth/api/auth-api";
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE,
  AUTH_COOKIE_OPTIONS,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_MAX_AGE,
  type AuthTokens,
} from "@/features/auth/lib/auth-cookies";
import { verifyJwt } from "@/features/auth/lib/jwt";
import { ROUTES } from "@/config/routes";

/** Các route chỉ dành cho quản trị viên. */
const ADMIN_PATH_PREFIXES = [ROUTES.teamBuilder, ROUTES.settings];

/**
 * Chạy trước mỗi request trang để làm hai việc:
 * 1. Tự gia hạn phiên — access token hết hạn mà refresh token còn hạn thì đổi cặp token mới.
 *    Proxy là chỗ duy nhất trong Next ghi được cookie cho mọi request, nên việc refresh
 *    phải nằm ở đây thay vì trong Server Component.
 * 2. Chặn truy cập trực tiếp (gõ/copy URL) vào route chỉ dành cho quản trị.
 * @param request - Request đang được xử lý
 * @returns Response tiếp tục xử lý (kèm cookie mới nếu vừa gia hạn), hoặc redirect về trang chủ
 */
export async function proxy(request: NextRequest) {
  const secret = process.env.AUTH_SECRET;
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (secret) {
    const access = await verifyJwt(accessToken, secret);
    if (access) return NextResponse.next();

    const refresh = refreshToken ? await verifyJwt(refreshToken, secret) : null;

    if (refresh && refreshToken) {
      const tokens = await refreshRequest(refreshToken).catch(() => null);
      if (tokens) return renewSession(request, tokens);
    }
  }

  // Chưa đăng nhập (hoặc phiên đã hết hạn hẳn): trang công khai vẫn vào được,
  // chỉ route quản trị mới bị đẩy về trang điểm danh.
  const isAdminPath = ADMIN_PATH_PREFIXES.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix)
  );
  const response = isAdminPath
    ? NextResponse.redirect(new URL(ROUTES.attendance, request.url))
    : NextResponse.next();

  // Xóa cookie hỏng/hết hạn để tránh gửi lại ở các request sau.
  if (accessToken) response.cookies.delete(ACCESS_TOKEN_COOKIE);
  if (refreshToken) response.cookies.delete(REFRESH_TOKEN_COOKIE);

  return response;
}

/**
 * Ghi cặp token vừa gia hạn vào cả request và response.
 * Ghi vào request để Server Component của chính lần render này đọc được token mới,
 * ghi vào response để trình duyệt lưu lại cho các request sau.
 * @param request - Request đang được xử lý
 * @param tokens - Cặp token mới do API phát
 * @returns Response tiếp tục xử lý kèm cookie đã cập nhật
 */
function renewSession(request: NextRequest, tokens: AuthTokens): NextResponse {
  request.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken);
  request.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken);

  const response = NextResponse.next({ request });
  response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...AUTH_COOKIE_OPTIONS,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...AUTH_COOKIE_OPTIONS,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });

  return response;
}

export const config = {
  // Chạy trên mọi route trang (bỏ qua static asset) để phiên được gia hạn ở bất cứ trang nào.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|img/).*)"],
};
