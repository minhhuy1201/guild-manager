import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api-client";

/**
 * `session.ts` carries `import "server-only"` and reads cookies through `next/headers`, neither of
 * which loads in this environment. Both are mocked so the one rule worth testing - what a Server
 * Action sees when the access token is gone - can be exercised without a browser or a request.
 */
vi.mock("server-only", () => ({}));

const cookieStore = { get: vi.fn() };

vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve(cookieStore),
}));

const { authHeader } = await import("../session");

describe("authHeader", () => {
  beforeEach(() => {
    cookieStore.get.mockReset();
  });

  it("gắn Bearer token khi cookie còn access token", async () => {
    cookieStore.get.mockReturnValue({ value: "access-token-gia" });

    await expect(authHeader()).resolves.toEqual({
      Authorization: "Bearer access-token-gia",
    });
  });

  it("thiếu access token thì ném ApiError 401 với câu hiện cho người dùng", async () => {
    cookieStore.get.mockReturnValue(undefined);

    // The four feature modules used to hold a copy of this each; the wording is what the UI shows
    // verbatim, so it is asserted rather than left to a snapshot.
    const error = await authHeader().catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toBe(
      "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại."
    );
    // 401 specifically: `isSessionExpired` keys the recovery flow off this status.
    expect((error as ApiError).statusCode).toBe(401);
  });
});
