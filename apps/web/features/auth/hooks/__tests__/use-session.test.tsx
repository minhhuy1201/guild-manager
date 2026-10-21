// @vitest-environment jsdom
import { waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderQueryHook } from "@/lib/__tests__/render-query-hook";

const api = vi.hoisted(() => ({ fetchMe: vi.fn() }));

vi.mock("../../api/me", () => api);

import { sessionKeys, useSession } from "../use-session";

describe("useSession", () => {
  it("keys the session under auth/me", () => {
    expect(sessionKeys.me()).toEqual(["auth", "me"]);
  });

  it("returns the signed-in user", async () => {
    api.fetchMe.mockResolvedValue({ ok: true, data: { role: "admin" } });

    const { result } = renderQueryHook(() => useSession());

    await waitFor(() => expect(result.current.data).toEqual({ role: "admin" }));
  });

  it("errors with the 401 message when the session is gone", async () => {
    api.fetchMe.mockResolvedValue({ ok: false, message: "Hết hạn", statusCode: 401 });

    const { result } = renderQueryHook(() => useSession());

    await waitFor(() => expect(result.current.error?.message).toBe("Hết hạn"));
  });
});
