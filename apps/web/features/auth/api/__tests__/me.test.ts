import { afterEach, describe, expect, it, vi } from "vitest";

import { mockFetch, requestOf } from "@/lib/__tests__/mock-fetch";

const session = vi.hoisted(() => ({ getAccessToken: vi.fn() }));

vi.mock("../session", () => session);

const { fetchMe } = await import("../me");

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchMe", () => {
  it("returns a 401 value without calling the API when the token is gone", async () => {
    session.getAccessToken.mockResolvedValue(null);
    const fetchMock = mockFetch({ status: 200, body: { data: {} } });

    await expect(fetchMe()).resolves.toEqual({
      ok: false,
      message: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.",
      statusCode: 401,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reads the user with the cookie's token", async () => {
    session.getAccessToken.mockResolvedValue("access-token-gia");
    const fetchMock = mockFetch({ status: 200, body: { data: { role: "admin" } } });

    await expect(fetchMe()).resolves.toEqual({ ok: true, data: { role: "admin" } });

    const { url, init } = requestOf(fetchMock);
    expect(url).toContain("/auth/me");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer access-token-gia"
    );
  });
});
