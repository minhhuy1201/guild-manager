import { afterEach, describe, expect, it, vi } from "vitest";

import { mockFetch, requestOf } from "@/lib/__tests__/mock-fetch";

vi.mock("@/features/auth/server", () => ({
  authHeader: () => Promise.resolve({ Authorization: "Bearer access-token-gia" }),
}));

const { createMember, deleteMember, fetchMembers, updateMember } = await import(
  "../members-api"
);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("members API", () => {
  it("lists members with the session's token", async () => {
    const fetchMock = mockFetch({ status: 200, body: { data: [] } });

    await expect(fetchMembers()).resolves.toEqual({ ok: true, data: [] });

    const { url, init } = requestOf(fetchMock);
    expect(url).toContain("/characters");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer access-token-gia"
    );
  });

  it("posts the input when creating", async () => {
    const fetchMock = mockFetch({ status: 201, body: { data: { id: "m1" } } });

    await createMember({ name: "Gia", class: "mingyi" } as never);

    const { init } = requestOf(fetchMock);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ name: "Gia", class: "mingyi" });
  });

  it("returns the backend's rejection as a value", async () => {
    mockFetch({ status: 409, body: { message: "Discord ID đã tồn tại" } });

    await expect(createMember({ name: "Gia" } as never)).resolves.toEqual({
      ok: false,
      message: "Discord ID đã tồn tại",
      statusCode: 409,
    });
  });

  it("escapes the id when editing", async () => {
    const fetchMock = mockFetch({ status: 200, body: { data: { id: "a b" } } });

    await updateMember("a b", { name: "Mới" });

    const { url, init } = requestOf(fetchMock);
    expect(url).toContain("/characters/a%20b");
    expect(init.method).toBe("PATCH");
  });

  it("escapes the id when deleting", async () => {
    const fetchMock = mockFetch({ status: 204, body: undefined });

    await deleteMember("a b");

    const { url, init } = requestOf(fetchMock);
    expect(url).toContain("/characters/a%20b");
    expect(init.method).toBe("DELETE");
  });
});
