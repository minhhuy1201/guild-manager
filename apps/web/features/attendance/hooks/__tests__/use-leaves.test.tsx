// @vitest-environment jsdom
import { act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderQueryHook } from "@/lib/__tests__/render-query-hook";

const api = vi.hoisted(() => ({
  cancelLeave: vi.fn(),
  createLeave: vi.fn(),
  fetchLeaves: vi.fn(),
}));
const invalidate = vi.hoisted(() => vi.fn());

vi.mock("../../api/leave-api", () => api);
vi.mock("@/hooks/use-invalidate", () => ({ useInvalidate: () => invalidate }));

import { useCancelLeave, useCreateLeave, useLeaves } from "../use-leaves";

describe("leave hooks", () => {
  it("reads the leave list", async () => {
    api.fetchLeaves.mockResolvedValue({ ok: true, data: [{ id: "l1" }] });

    const { result } = renderQueryHook(() => useLeaves());

    await waitFor(() => expect(result.current.data).toEqual([{ id: "l1" }]));
  });

  it.each([
    ["useCreateLeave", useCreateLeave, api.createLeave, {}],
    ["useCancelLeave", useCancelLeave, api.cancelLeave, "l1"],
  ] as const)("%s invalidates on success only", async (_name, useHook, action, variables) => {
    action.mockResolvedValue({ ok: true, data: { id: "l1" } });
    const { result } = renderQueryHook(() => useHook());

    await act(() => result.current.mutateAsync(variables as never));
    expect(invalidate).toHaveBeenCalledTimes(1);

    action.mockResolvedValue({ ok: false, message: "Từ chối", statusCode: 409 });
    await expect(
      act(() => result.current.mutateAsync(variables as never))
    ).rejects.toThrow("Từ chối");
    expect(invalidate).toHaveBeenCalledTimes(1);
  });
});
