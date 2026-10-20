// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  createMember: vi.fn(),
  updateMember: vi.fn(),
  deleteMember: vi.fn(),
}));
const invalidate = vi.hoisted(() => vi.fn());

vi.mock("../../api/members-api", () => api);
vi.mock("@/hooks/use-invalidate", () => ({ useInvalidate: () => invalidate }));

import {
  useCreateMember,
  useDeleteMember,
  useUpdateMember,
} from "../use-member-mutations";

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
  message: "Discord ID đã thuộc về thành viên khác.",
  statusCode: 409,
};

describe.each([
  ["useCreateMember", useCreateMember, api.createMember, {}],
  ["useUpdateMember", useUpdateMember, api.updateMember, { id: "m1", input: {} }],
  ["useDeleteMember", useDeleteMember, api.deleteMember, "m1"],
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
        statusCode: 409,
      });
    });
    expect(invalidate).not.toHaveBeenCalled();
  });
});
