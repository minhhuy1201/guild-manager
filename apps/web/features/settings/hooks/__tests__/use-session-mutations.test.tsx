// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  createBattleSession: vi.fn(),
  updateBattleSession: vi.fn(),
  deleteBattleSession: vi.fn(),
  reopenAttendance: vi.fn(),
}));
const invalidate = vi.hoisted(() => vi.fn());

vi.mock("../../api/battle-sessions-api", () => api);
vi.mock("@/hooks/use-invalidate", () => ({ useInvalidate: () => invalidate }));

import {
  useCreateSession,
  useDeleteSession,
  useReopenAttendance,
  useUpdateSession,
} from "../use-session-mutations";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Wrapper giving a hook a fresh query client.
 * @param props - Children to wrap
 */
function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient();

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

afterEach(cleanup);

const REJECTED = {
  ok: false,
  message: "Hạn điểm danh đã qua.",
  statusCode: 400,
};

describe.each([
  ["useCreateSession", useCreateSession, api.createBattleSession, {}],
  ["useUpdateSession", useUpdateSession, api.updateBattleSession, { id: "s1", input: {} }],
  ["useDeleteSession", useDeleteSession, api.deleteBattleSession, "s1"],
  ["useReopenAttendance", useReopenAttendance, api.reopenAttendance, "s1"],
] as const)("%s", (_name, useHook, action, variables) => {
  it("rejects with the backend's ApiError and does not invalidate", async () => {
    action.mockResolvedValue(REJECTED);
    const { result } = renderHook(() => useHook(), { wrapper });

    await act(async () => {
      await expect(
        (result.current.mutateAsync as (v: unknown) => Promise<unknown>)(variables)
      ).rejects.toMatchObject({
        name: "ApiError",
        message: REJECTED.message,
        statusCode: 400,
      });
    });
    expect(invalidate).not.toHaveBeenCalled();
  });
});
