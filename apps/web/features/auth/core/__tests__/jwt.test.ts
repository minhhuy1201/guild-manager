import { describe, expect, it } from "vitest";

import { verifyJwt } from "../jwt";

const SECRET = "secret-du-dai-cho-hmac-sha256-trong-test";
const encoder = new TextEncoder();

/**
 * Mã hoá bytes hoặc chuỗi thành base64url không padding.
 * @param value - Chuỗi UTF-8 hoặc bytes thô cần mã hoá
 * @returns Chuỗi base64url
 */
function toBase64Url(value: string | Uint8Array): string {
  const binary =
    typeof value === "string"
      ? String.fromCharCode(...encoder.encode(value))
      : String.fromCharCode(...value);

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Ký chuỗi `header.body` bằng HMAC-SHA256 — dùng chính Web Crypto như backend.
 * @param data - Chuỗi `header.body` cần ký
 * @param secret - Khoá bí mật dùng để ký
 * @returns Chữ ký dạng base64url
 */
async function sign(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));

  return toBase64Url(new Uint8Array(signature));
}

/** Thời điểm hết hạn cách hiện tại một giờ (epoch giây). */
function inOneHour(): number {
  return Math.floor(Date.now() / 1000) + 3600;
}

/**
 * Dựng một JWT với header và payload tuỳ ý, chữ ký luôn được tính đúng theo secret.
 * @param header - Nội dung header (mặc định `{ alg: "HS256" }`)
 * @param payload - Nội dung payload
 * @param secret - Khoá dùng ký (mặc định `SECRET`)
 * @returns Token ba đoạn
 */
async function makeToken(
  header: Record<string, unknown> = { alg: "HS256", typ: "JWT" },
  payload: Record<string, unknown> = {
    sub: "admin",
    role: "admin",
    type: "access",
    exp: inOneHour(),
  },
  secret: string = SECRET
): Promise<string> {
  const data = `${toBase64Url(JSON.stringify(header))}.${toBase64Url(
    JSON.stringify(payload)
  )}`;

  return `${data}.${await sign(data, secret)}`;
}

describe("verifyJwt", () => {
  it("trả payload khi token được ký bằng đúng secret và còn hạn", async () => {
    const exp = inOneHour();
    const token = await makeToken(undefined, {
      sub: "admin",
      role: "admin",
      type: "access",
      exp,
    });

    await expect(verifyJwt(token, SECRET)).resolves.toEqual({
      sub: "admin",
      role: "admin",
      type: "access",
      exp,
    });
  });

  it("trả null khi token được ký bằng secret khác", async () => {
    const token = await makeToken(undefined, undefined, "secret-khac-hoan-toan");

    await expect(verifyJwt(token, SECRET)).resolves.toBeNull();
  });

  it.each(["none", "RS256"])(
    "trả null với alg %s kể cả khi chữ ký HMAC được nặn cho khớp",
    async (alg) => {
      const token = await makeToken({ alg, typ: "JWT" });

      await expect(verifyJwt(token, SECRET)).resolves.toBeNull();
    }
  );

  it("trả null khi exp đã qua", async () => {
    const token = await makeToken(undefined, {
      sub: "admin",
      role: "admin",
      type: "access",
      exp: Math.floor(Date.now() / 1000) - 1,
    });

    await expect(verifyJwt(token, SECRET)).resolves.toBeNull();
  });

  it("trả null khi sub không phải string", async () => {
    const token = await makeToken(undefined, {
      sub: 42,
      role: "admin",
      type: "access",
      exp: inOneHour(),
    });

    await expect(verifyJwt(token, SECRET)).resolves.toBeNull();
  });

  it.each([
    ["undefined", undefined],
    ["chuỗi rỗng", ""],
    ["thiếu đoạn", "chi-co-hai.doan"],
    ["base64 hỏng", "!!!.@@@.###"],
    ["JSON hỏng", `${toBase64Url("khong-phai-json")}.a.b`],
  ])("trả null với token %s, không ném", async (_label, token) => {
    await expect(verifyJwt(token, SECRET)).resolves.toBeNull();
  });
});
