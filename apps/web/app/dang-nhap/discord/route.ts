import { NextResponse, type NextRequest } from "next/server";

import { ROUTES } from "@/config/routes";
import { createSession } from "@/features/auth/server";
import { exchangeRequest } from "@/features/auth/core";

/** Mã lỗi gắn vào `/dang-nhap` khi không đổi được mã lấy token. */
const EXPIRED_ERROR = "phien-het-han";

/**
 * Route "/dang-nhap/discord" — nhận mã đổi API gắn vào URL, lấy cặp token và ghi cookie phiên.
 *
 * Là Route Handler chứ không phải trang: Server Component không ghi được cookie.
 * @param request - Request kèm `?exchange=` và `?redirect=`
 * @returns Redirect về trang người dùng định vào, hoặc về trang đăng nhập kèm mã lỗi
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const code = request.nextUrl.searchParams.get("exchange");
  const redirect =
    request.nextUrl.searchParams.get("redirect") ?? ROUTES.attendance;

  const tokens = code ? await exchangeRequest(code).catch(() => null) : null;
  if (!tokens) {
    return NextResponse.redirect(
      new URL(`${ROUTES.login}?error=${EXPIRED_ERROR}`, request.url)
    );
  }

  await createSession(tokens);

  // Chỉ nhận đường dẫn tương đối — cùng lý do `safeRedirect` ở API.
  const target =
    redirect.startsWith("/") && !redirect.startsWith("//")
      ? redirect
      : ROUTES.attendance;

  return NextResponse.redirect(new URL(target, request.url));
}
