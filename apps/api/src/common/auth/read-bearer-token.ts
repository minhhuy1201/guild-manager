import type { JwtPayload, TokenType } from '../constants/auth.constant';

/** Prefix của header Authorization theo chuẩn Bearer, phân biệt hoa thường như `startsWith`. */
const BEARER_PREFIX = 'Bearer ';

/**
 * Verify chữ ký và hạn của một JWT.
 * Được phép ném — `readToken` là chỗ duy nhất bắt lỗi đó.
 */
export type VerifyToken = (token: string) => Promise<JwtPayload>;

/**
 * Verify một token và kiểm đúng loại.
 *
 * Mọi kiểu không hợp lệ đều quy về một giá trị: token hỏng, sai chữ ký, hết hạn, hoặc đúng chữ ký
 * nhưng sai loại (refresh token gửi vào route cần access) — tất cả cho `null`. Người gọi quyết định
 * `null` nghĩa là "chặn" hay "khách ẩn danh".
 * @param token - Token trần, không có prefix
 * @param verify - Hàm verify JWT; được phép ném
 * @param expectedType - Loại token bắt buộc phải khớp
 * @returns Payload đã verify và đúng loại, hoặc null
 */
export async function readToken(
  token: string,
  verify: VerifyToken,
  expectedType: TokenType,
): Promise<JwtPayload | null> {
  const payload = await verify(token).catch(() => null);

  return payload?.type === expectedType ? payload : null;
}

/**
 * Đọc và verify token trong header Authorization.
 * Thiếu header hoặc sai scheme cũng cho `null`, cùng đường với token hỏng.
 * @param header - Giá trị header Authorization, undefined khi không có
 * @param verify - Hàm verify JWT; được phép ném
 * @param expectedType - Loại token bắt buộc phải khớp
 * @returns Payload đã verify và đúng loại, hoặc null
 */
export async function readBearerToken(
  header: string | undefined,
  verify: VerifyToken,
  expectedType: TokenType,
): Promise<JwtPayload | null> {
  if (!header?.startsWith(BEARER_PREFIX)) return null;

  return readToken(header.slice(BEARER_PREFIX.length), verify, expectedType);
}
