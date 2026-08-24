/**
 * Verify JWT HS256 do backend (apps/api) ký, bằng Web Crypto.
 * File này nằm trong `core/` nên không dùng API riêng của Node hay `next/headers`,
 * chạy được cả ở proxy (Edge runtime) lẫn server action.
 */
import type { GuildRole } from "@guild/shared/enums";

/** Thuật toán duy nhất được chấp nhận — trùng với thuật toán mặc định của @nestjs/jwt. */
const EXPECTED_ALG = "HS256";

/** Nội dung payload mà backend ký trong access/refresh token. */
export interface JwtPayload {
  /** Discord ID của người đăng nhập */
  sub: string;
  /** Vai trong bang */
  role: GuildRole;
  /** Token này là "access" hay "refresh" */
  type: string;
  /** Thời điểm hết hạn (epoch giây) */
  exp: number;
}

const encoder = new TextEncoder();

/**
 * Giải mã chuỗi base64url về bytes.
 * @param value - Chuỗi base64url (không padding)
 * @returns Dữ liệu gốc
 */
function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Tạo CryptoKey HMAC-SHA256 từ secret.
 * @param secret - Chuỗi bí mật (AUTH_SECRET, trùng giá trị với apps/api)
 * @returns CryptoKey dùng để verify chữ ký
 */
function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

/**
 * Verify chữ ký và hạn dùng của một JWT.
 * @param token - Token lấy từ cookie (có thể undefined)
 * @param secret - Khóa bí mật backend dùng để ký
 * @returns Payload nếu token hợp lệ và còn hạn, ngược lại null
 */
export async function verifyJwt(
  token: string | undefined,
  secret: string
): Promise<JwtPayload | null> {
  if (!token) return null;

  const [header, body, signature] = token.split(".");
  if (!header || !body || !signature) return null;

  try {
    const { alg } = JSON.parse(
      new TextDecoder().decode(fromBase64Url(header))
    ) as { alg?: string };
    if (alg !== EXPECTED_ALG) return null;

    const key = await importKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(signature),
      encoder.encode(`${header}.${body}`)
    );
    if (!valid) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(body))
    ) as JwtPayload;

    if (typeof payload.sub !== "string" || typeof payload.exp !== "number") {
      return null;
    }
    if (payload.exp * 1000 <= Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}
