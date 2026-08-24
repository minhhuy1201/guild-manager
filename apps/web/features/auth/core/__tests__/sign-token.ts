/**
 * Ký JWT HS256 bằng Web Crypto — bản test-only của việc backend làm ở `apps/api`.
 * Đặt cạnh test của `core/` vì cả test JWT lẫn test proxy đều cần dựng token thật.
 * Không có đuôi `.test.ts` nên Vitest không thu file này như một suite.
 */

import { GuildRole } from "@guild/shared/enums";

const encoder = new TextEncoder();

/**
 * Mã hoá chuỗi hoặc bytes thành base64url không padding.
 * @param value - Chuỗi UTF-8 hoặc bytes thô cần mã hoá
 * @returns Chuỗi base64url
 */
export function toBase64Url(value: string | Uint8Array): string {
  const binary =
    typeof value === "string"
      ? String.fromCharCode(...encoder.encode(value))
      : String.fromCharCode(...value);

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/** Thời điểm hết hạn cách hiện tại `seconds` giây (epoch giây, có thể âm để tạo token hết hạn). */
export function expiresIn(seconds: number): number {
  return Math.floor(Date.now() / 1000) + seconds;
}

/** Payload mặc định của một access token hợp lệ — quản trị viên. */
export const DEFAULT_PAYLOAD: Record<string, unknown> = {
  sub: "999888777666555444",
  role: GuildRole.ADMIN,
  type: "access",
};

/** Payload của một access token hợp lệ thuộc bang chúng. */
export const MEMBER_PAYLOAD: Record<string, unknown> = {
  sub: "123456789012345678",
  role: GuildRole.MEMBER,
  type: "access",
};

/**
 * Dựng JWT với header và payload tuỳ ý; chữ ký luôn được tính đúng theo `secret`,
 * kể cả khi header khai `alg` khác — để test được tấn công đổi thuật toán.
 * @param options - Header, payload và secret muốn dùng
 * @returns Token ba đoạn
 */
export async function signToken({
  header = { alg: "HS256", typ: "JWT" },
  payload = { ...DEFAULT_PAYLOAD, exp: expiresIn(3600) },
  secret,
}: {
  header?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  secret: string;
}): Promise<string> {
  const data = `${toBase64Url(JSON.stringify(header))}.${toBase64Url(
    JSON.stringify(payload)
  )}`;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));

  return `${data}.${toBase64Url(new Uint8Array(signature))}`;
}
