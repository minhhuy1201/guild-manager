/**
 * Ký/xác thực token phiên đăng nhập bằng HMAC-SHA256 (Web Crypto).
 * File này không dùng API riêng của Node hay `next/headers` nên chạy được cả ở
 * middleware (Edge runtime) lẫn server action.
 */

/** Tên cookie chứa token phiên quản trị. */
export const SESSION_COOKIE = "admin_session";

/** Thời hạn phiên đăng nhập (giây) — 8 tiếng. */
export const SESSION_MAX_AGE = 60 * 60 * 8;

/** Nội dung được ký trong token phiên. */
export interface SessionPayload {
  /** Tên đăng nhập của quản trị viên */
  username: string;
  /** Thời điểm hết hạn (epoch giây) */
  exp: number;
}

const encoder = new TextEncoder();

/**
 * Mã hóa chuỗi bytes sang base64url (không padding) để nhét được vào cookie.
 * @param bytes - Dữ liệu cần mã hóa
 * @returns Chuỗi base64url
 */
function toBase64Url(bytes: Uint8Array): string {
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Giải mã chuỗi base64url về bytes.
 * @param value - Chuỗi base64url
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
 * Tạo CryptoKey HMAC từ secret.
 * @param secret - Chuỗi bí mật (AUTH_SECRET)
 * @returns CryptoKey dùng để ký/verify
 */
function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Ký payload phiên thành token dạng `<payload>.<signature>`.
 * @param payload - Thông tin phiên cần ký
 * @param secret - Chuỗi bí mật dùng để ký
 * @returns Token đã ký
 */
export async function signSessionToken(
  payload: SessionPayload,
  secret: string
): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await importKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

/**
 * Xác thực token phiên: kiểm tra chữ ký HMAC và hạn sử dụng.
 * @param token - Token lấy từ cookie (có thể undefined)
 * @param secret - Chuỗi bí mật dùng để ký
 * @returns Payload nếu token hợp lệ và còn hạn, ngược lại trả về null
 */
export async function verifySessionToken(
  token: string | undefined,
  secret: string
): Promise<SessionPayload | null> {
  if (!token) return null;

  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const key = await importKey(secret);
  const valid = await crypto.subtle
    .verify("HMAC", key, fromBase64Url(signature), encoder.encode(body))
    .catch(() => false);
  if (!valid) return null;

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(body))
    ) as SessionPayload;

    if (typeof payload.username !== "string" || typeof payload.exp !== "number") {
      return null;
    }
    if (payload.exp * 1000 <= Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}
