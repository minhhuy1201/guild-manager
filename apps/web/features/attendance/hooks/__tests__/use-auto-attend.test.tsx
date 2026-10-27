// @vitest-environment jsdom
import { act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderQueryHook } from "@/lib/__tests__/render-query-hook";

const api = vi.hoisted(() => ({
  fetchAutoAttend: vi.fn(),
  setAutoAttend: vi.fn(),
}));
const invalidate = vi.hoisted(() => vi.fn());

vi.mock("../../api/auto-attend-api", () => api);
vi.mock("@/hooks/use-invalidate", () => ({ useInvalidate: () => invalidate }));

import { useAutoAttend, useSetAutoAttend } from "../use-auto-attend";

describe("auto-attend hooks", () => {
  it("reads the status", async () => {
    api.fetchAutoAttend.mockResolvedValue({
      ok: true,
      data: { enabled: false, enabledAt: null },
    });

    const { result } = renderQueryHook(() => useAutoAttend());

    await waitFor(() =>
      expect(result.current.data).toEqual({ enabled: false, enabledAt: null })
    );
  });

  it("invalidates on a successful switch only", async () => {
    api.setAutoAttend.mockResolvedValue({
      ok: true,
      data: { enabled: true, enabledAt: "2026-10-27T01:00:00.000Z" },
    });
    const { result } = renderQueryHook(() => useSetAutoAttend());

    await act(() => result.current.mutateAsync(true));
    expect(api.setAutoAttend).toHaveBeenCalledWith(true);
    expect(invalidate).toHaveBeenCalledTimes(1);

    api.setAutoAttend.mockResolvedValue({
      ok: false,
      message: "Từ chối",
      statusCode: 404,
    });
    await expect(act(() => result.current.mutateAsync(false))).rejects.toThrow("Từ chối");
    expect(invalidate).toHaveBeenCalledTimes(1);
  });
});
