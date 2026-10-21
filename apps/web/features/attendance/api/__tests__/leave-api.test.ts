import { afterEach, describe, expect, it, vi } from "vitest";

import { mockFetch, requestOf } from "@/lib/__tests__/mock-fetch";

vi.mock("@/features/auth/server", () => ({
  authHeader: () => Promise.resolve({ Authorization: "Bearer access-token-gia" }),
}));

const { cancelLeave, createLeave, fetchLeaves } = await import("../leave-api");

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("leave API", () => {
  it("lists leaves with the session's token", async () => {
    const fetchMock = mockFetch({ status: 200, body: { data: [] } });

    await expect(fetchLeaves()).resolves.toEqual({ ok: true, data: [] });

    const { url, init } = requestOf(fetchMock);
    expect(url).toContain("/leaves");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer access-token-gia"
    );
  });

  it("posts the input when filing a leave", async () => {
    const fetchMock = mockFetch({ status: 201, body: { data: { id: "l1" } } });
    const input = { characterId: "c1", sessionIds: ["s1"] };

    await createLeave(input as never);

    const { init } = requestOf(fetchMock);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual(input);
  });

  it("escapes the id when cancelling", async () => {
    const fetchMock = mockFetch({ status: 200, body: { data: { id: "a b" } } });

    await cancelLeave("a b");

    const { url, init } = requestOf(fetchMock);
    expect(url).toContain("/leaves/a%20b/cancel");
    expect(init.method).toBe("POST");
  });

  it("returns the backend's rejection as a value", async () => {
    mockFetch({ status: 404, body: { message: "Không tìm thấy đơn nghỉ" } });

    await expect(cancelLeave("x")).resolves.toEqual({
      ok: false,
      message: "Không tìm thấy đơn nghỉ",
      statusCode: 404,
    });
  });
});
