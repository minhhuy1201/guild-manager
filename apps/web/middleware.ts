import { NextResponse, type NextRequest } from "next/server";

import {
  SESSION_COOKIE,
  verifySessionToken,
} from "@/features/auth/lib/session-token";
import { ROUTES } from "@/config/routes";

/**
 * Chặn truy cập trực tiếp (gõ/copy URL) vào các route chỉ dành cho quản trị.
 * Kiểm tra chữ ký + hạn của cookie phiên trước khi render trang.
 * @param request - Request đang được xử lý
 * @returns Response tiếp tục xử lý, hoặc redirect về trang chủ nếu không có quyền
 */
export async function middleware(request: NextRequest) {
  const secret = process.env.AUTH_SECRET;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = secret ? await verifySessionToken(token, secret) : null;

  if (session) return NextResponse.next();

  const redirectUrl = new URL(ROUTES.attendance, request.url);
  const response = NextResponse.redirect(redirectUrl);
  // Xóa cookie hỏng/hết hạn để tránh gửi lại ở các request sau.
  if (token) response.cookies.delete(SESSION_COOKIE);
  return response;
}

export const config = {
  matcher: ["/xep-team/:path*"],
};
