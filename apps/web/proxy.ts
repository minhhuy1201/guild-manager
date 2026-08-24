import { NextResponse, type NextRequest } from "next/server";
import type { GuildRole } from "@guild/shared/enums";
import type { AuthTokens } from "@guild/shared/schemas";

import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE,
  AUTH_COOKIE_OPTIONS,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_MAX_AGE,
  decideAccess,
  refreshRequest,
  verifyJwt,
  type AccessDecision,
} from "@/features/auth/core";
import { ROUTES } from "@/config/routes";

/**
 * Đọc AUTH_SECRET, kêu to khi thiếu.
 *
 * Thiếu biến này thì mọi token đều không verify được, tức là quản trị viên đăng nhập xong vẫn bị
 * đá khỏi route quản trị — triệu chứng giống hệt phiên hết hạn nên rất dễ đi tìm nhầm chỗ. Không
 * ném lỗi vì proxy chạy trước **mọi** trang: ném là sập cả trang điểm danh công khai, trong khi
 * cấu hình sai chỉ ảnh hưởng phần quản trị. `getAuthSecret()` trong `features/auth/api/session.ts`
 * cố ý làm ngược lại (ném) vì Server Component lỗi thì chỉ hỏng đúng trang đó — đừng "sửa" cho hai
 * hàm giống nhau.
 *
 * @returns Khóa ký JWT, hoặc undefined khi chưa cấu hình
 */
function readAuthSecret(): string | undefined {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    console.error(
      "Thiếu biến môi trường AUTH_SECRET — không verify được token, mọi route quản trị sẽ bị chặn."
    );
  }

  return secret;
}

/**
 * Chạy trước mỗi request trang để làm hai việc:
 * 1. Tự gia hạn phiên — access token hết hạn mà refresh token còn hạn thì đổi cặp token mới.
 *    Proxy là chỗ duy nhất trong Next ghi được cookie cho mọi request, nên việc refresh
 *    phải nằm ở đây thay vì trong Server Component.
 * 2. Quyết định request được đi tiếp hay bị đá đi đâu — mặc định là **cần đăng nhập**:
 *    ngoài `/dang-nhap` thì không còn trang công khai nào.
 * @param request - Request đang được xử lý
 * @returns Response tiếp tục xử lý (kèm cookie mới nếu vừa gia hạn), hoặc redirect
 */
export async function proxy(request: NextRequest) {
  const secret = readAuthSecret();
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (secret) {
    const access = await verifyJwt(accessToken, secret);
    if (access) return decide(request, access.role, NextResponse.next());

    const refresh = refreshToken ? await verifyJwt(refreshToken, secret) : null;

    if (refresh && refreshToken) {
      const tokens = await refreshRequest(refreshToken).catch(() => null);
      if (tokens) {
        return decide(request, tokens.user.role, renewSession(request, tokens));
      }
    }
  }

  // Đến đây nghĩa là không có access token dùng được và cũng không gia hạn được.
  const response =
    decideAccess({ pathname: request.nextUrl.pathname, role: null }) === "allow"
      ? NextResponse.next()
      : NextResponse.redirect(loginUrl(request));

  // Xóa cookie hỏng/hết hạn để tránh gửi lại ở các request sau.
  if (accessToken) response.cookies.delete(ACCESS_TOKEN_COOKIE);
  if (refreshToken) response.cookies.delete(REFRESH_TOKEN_COOKIE);

  return response;
}

/**
 * Áp kết luận của `decideAccess` cho một phiên còn dùng được.
 * @param request - Request đang được xử lý
 * @param role - Vai đọc từ access token
 * @param allowed - Response dùng khi request được đi tiếp (có thể mang cookie vừa gia hạn)
 * @returns Response đi tiếp, hoặc redirect về trang điểm danh khi thiếu quyền
 */
function decide(
  request: NextRequest,
  role: GuildRole,
  allowed: NextResponse
): NextResponse {
  const decision: AccessDecision = decideAccess({
    pathname: request.nextUrl.pathname,
    role,
  });

  return decision === "home"
    ? NextResponse.redirect(new URL(ROUTES.attendance, request.url))
    : allowed;
}

/**
 * URL trang đăng nhập, mang theo đường dẫn người dùng đang định vào.
 * @param request - Request đang xử lý
 * @returns URL tuyệt đối của trang đăng nhập
 */
function loginUrl(request: NextRequest): URL {
  const url = new URL(ROUTES.login, request.url);
  url.searchParams.set("redirect", request.nextUrl.pathname);

  return url;
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
