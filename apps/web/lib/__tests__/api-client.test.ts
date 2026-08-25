import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiFetch } from "../api-client";

/**
 * Build a fake fetch returning a specific response.
 * @param options - status and JSON body the server "returns"
 * @returns The mock replacing global fetch
 */
function mockFetch(options: { status: number; body: unknown | null }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: options.status >= 200 && options.status < 300,
    status: options.status,
    json: () =>
      options.body === null
        ? Promise.reject(new Error("not json"))
        : Promise.resolve(options.body),
  });
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

describe("apiFetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("bóc lớp bọc { data } của response thành công", async () => {
    mockFetch({ status: 200, body: { data: [{ id: "c1" }] } });

    await expect(apiFetch("/attendance/characters")).resolves.toEqual([
      { id: "c1" },
    ]);
  });

  it("ghép base URL và gửi đúng method/header/body khi POST", async () => {
    const fetchMock = mockFetch({ status: 201, body: { data: { ok: true } } });

    await apiFetch("/attendance", {
      method: "POST",
      body: JSON.stringify({ status: "CO" }),
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/api/attendance",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ status: "CO" }),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("ném ApiError giữ nguyên message tiếng Việt của backend", async () => {
    mockFetch({
      status: 401,
      body: { statusCode: 401, message: "Sai mật khẩu thành viên." },
    });

    await expect(apiFetch("/attendance")).rejects.toThrowError(
      new ApiError("Sai mật khẩu thành viên.", 401)
    );
  });

  it("dùng message mặc định khi body lỗi không phải JSON", async () => {
    mockFetch({ status: 502, body: null });

    await expect(apiFetch("/attendance")).rejects.toThrowError(
      "Không kết nối được máy chủ."
    );
  });
});
