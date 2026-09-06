import { afterEach, describe, expect, it, vi } from "vitest";

import { verifyJwt } from "../jwt";
import {
  DEFAULT_PAYLOAD,
  expiresIn,
  signToken,
  toBase64Url,
} from "./sign-token";

const SECRET = "secret-du-dai-cho-hmac-sha256-trong-test";

describe("verifyJwt", () => {
  it("trả payload khi token được ký bằng đúng secret và còn hạn", async () => {
    const exp = expiresIn(3600);
    const token = await signToken({
      payload: { ...DEFAULT_PAYLOAD, exp },
      secret: SECRET,
    });

    await expect(verifyJwt(token, SECRET)).resolves.toEqual({
      ...DEFAULT_PAYLOAD,
      exp,
    });
  });

  it("trả null khi token được ký bằng secret khác", async () => {
    const token = await signToken({ secret: "secret-khac-hoan-toan" });

    await expect(verifyJwt(token, SECRET)).resolves.toBeNull();
  });

  it.each(["none", "RS256"])(
    "trả null với alg %s kể cả khi chữ ký HMAC được nặn cho khớp",
    async (alg) => {
      const token = await signToken({
        header: { alg, typ: "JWT" },
        secret: SECRET,
      });

      await expect(verifyJwt(token, SECRET)).resolves.toBeNull();
    }
  );

  it("trả null khi exp đã qua", async () => {
    const token = await signToken({
      payload: { ...DEFAULT_PAYLOAD, exp: expiresIn(-1) },
      secret: SECRET,
    });

    await expect(verifyJwt(token, SECRET)).resolves.toBeNull();
  });

  it("trả null khi sub không phải string", async () => {
    const token = await signToken({
      payload: { ...DEFAULT_PAYLOAD, sub: 42, exp: expiresIn(3600) },
      secret: SECRET,
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

// The key cache lives at module scope, so it survives between tests: every test here uses its own
// secret rather than the shared SECRET, and spies only after signToken has done its own importKey.
describe("verifyJwt - cache khoá HMAC", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("verify hai lần với cùng secret chỉ dựng khoá một lần", async () => {
    const secret = "secret-rieng-cho-test-dung-khoa-mot-lan";
    const token = await signToken({ secret });
    const importKey = vi.spyOn(crypto.subtle, "importKey");

    await expect(verifyJwt(token, secret)).resolves.toMatchObject({
      sub: DEFAULT_PAYLOAD.sub,
    });
    await expect(verifyJwt(token, secret)).resolves.toMatchObject({
      sub: DEFAULT_PAYLOAD.sub,
    });

    expect(importKey).toHaveBeenCalledTimes(1);
  });

  it("hai secret khác nhau dựng hai khoá riêng", async () => {
    const first = "secret-rieng-cho-test-hai-secret-mot";
    const second = "secret-rieng-cho-test-hai-secret-hai";
    const firstToken = await signToken({ secret: first });
    const secondToken = await signToken({ secret: second });
    const importKey = vi.spyOn(crypto.subtle, "importKey");

    await expect(verifyJwt(firstToken, first)).resolves.not.toBeNull();
    await expect(verifyJwt(secondToken, second)).resolves.not.toBeNull();
    // The cache must not hand the second secret the first secret's key.
    await expect(verifyJwt(firstToken, second)).resolves.toBeNull();

    expect(importKey).toHaveBeenCalledTimes(2);
  });

  it("hai lần verify đồng thời chỉ dựng khoá một lần", async () => {
    const secret = "secret-rieng-cho-test-verify-dong-thoi";
    const token = await signToken({ secret });
    const importKey = vi.spyOn(crypto.subtle, "importKey");

    const results = await Promise.all([
      verifyJwt(token, secret),
      verifyJwt(token, secret),
    ]);

    expect(results.every((payload) => payload !== null)).toBe(true);
    expect(importKey).toHaveBeenCalledTimes(1);
  });

  it("importKey hỏng một lần không khoá chết các lần verify sau", async () => {
    const secret = "secret-rieng-cho-test-import-hong-mot-lan";
    const token = await signToken({ secret });
    const importKey = vi
      .spyOn(crypto.subtle, "importKey")
      .mockRejectedValueOnce(new Error("import hỏng nhất thời"));

    await expect(verifyJwt(token, secret)).resolves.toBeNull();
    await expect(verifyJwt(token, secret)).resolves.not.toBeNull();

    expect(importKey).toHaveBeenCalledTimes(2);
  });
});
