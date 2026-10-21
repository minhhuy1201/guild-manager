// @vitest-environment jsdom
import { waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderQueryHook } from "@/lib/__tests__/render-query-hook";

const api = vi.hoisted(() => ({ fetchMembers: vi.fn() }));

vi.mock("../../api/members-api", () => api);

import { useMembers } from "../use-members";

describe("useMembers", () => {
  it("returns the member list", async () => {
    api.fetchMembers.mockResolvedValue({ ok: true, data: [{ id: "m1" }] });

    const { result } = renderQueryHook(() => useMembers());

    await waitFor(() => expect(result.current.data).toEqual([{ id: "m1" }]));
  });

  it("errors with the backend's message", async () => {
    api.fetchMembers.mockResolvedValue({ ok: false, message: "Hết phiên", statusCode: 401 });

    const { result } = renderQueryHook(() => useMembers());

    await waitFor(() => expect(result.current.error?.message).toBe("Hết phiên"));
  });
});
