import { afterEach, describe, expect, it, vi } from "vitest";

import { mockFetch, requestOf } from "@/lib/__tests__/mock-fetch";

vi.mock("@/features/auth/server", () => ({
  authHeader: () => Promise.resolve({ Authorization: "Bearer access-token-gia" }),
}));

const { fetchAutoAttend, setAutoAttend } = await import("../auto-attend-api");

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("auto-attend API", () => {
  it("reads the status with the session's token", async () => {
    const status = { enabled: true, enabledAt: "2026-10-20T01:00:00.000Z" };
    const fetchMock = mockFetch({ status: 200, body: { data: status } });

    await expect(fetchAutoAttend()).resolves.toEqual({ ok: true, data: status });

    const { url, init } = requestOf(fetchMock);
    expect(url).toContain("/auto-attend/me");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer access-token-gia"
    );
  });

  it.each([true, false])("puts enabled=%s to switch it", async (enabled) => {
    const fetchMock = mockFetch({
      status: 200,
      body: { data: { enabled, enabledAt: null } },
    });

    await setAutoAttend(enabled);

    const { url, init } = requestOf(fetchMock);
    expect(url).toContain("/auto-attend/me");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(String(init.body))).toEqual({ enabled });
  });

  it("returns the backend's rejection as a value", async () => {
    mockFetch({ status: 404, body: { message: "Không tìm thấy thành viên." } });

    await expect(fetchAutoAttend()).resolves.toMatchObject({
      ok: false,
      message: "Không tìm thấy thành viên.",
      statusCode: 404,
    });
  });
});
