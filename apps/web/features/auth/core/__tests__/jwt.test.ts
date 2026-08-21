import { describe, expect, it } from "vitest";

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
