// @vitest-environment jsdom
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { attendanceKeys } from "@/features/attendance/api/attendance-keys";
import { settingsKeys } from "@/features/settings/api/battle-sessions-keys";
import { teamBuilderKeys } from "@/features/team-builder/api/team-builder-keys";
import { useInvalidate } from "../use-invalidate";

afterEach(cleanup);

/**
 * Render `useInvalidate` inside its own QueryClient and watch its invalidate calls.
 * @param topic - Topic passed to the hook
 * @returns The renderHook result plus the spy on `invalidateQueries`
 */
function renderInvalidate(topic: Parameters<typeof useInvalidate>[0]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidateSpy = vi
    .spyOn(queryClient, "invalidateQueries")
    .mockResolvedValue(undefined);

  const rendered = renderHook(() => useInvalidate(topic), {
    /**
     * Provide a QueryClient to the hook under test.
     * @param props - Children rendered inside the provider
     * @returns The tree wrapped in the provider
     */
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children),
  });

  return { ...rendered, invalidateSpy };
}

describe("useInvalidate", () => {
  it("invalidate đúng từng key của chủ đề", () => {
    const { result, invalidateSpy } = renderInvalidate("schedule");

    result.current();

    expect(invalidateSpy).toHaveBeenCalledTimes(4);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: settingsKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: attendanceKeys.sessions(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: attendanceKeys.records(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: teamBuilderKeys.all,
    });
  });

  it("chủ đề hẹp chỉ invalidate một key", () => {
    const { result, invalidateSpy } = renderInvalidate("formation");

    result.current();

    expect(invalidateSpy).toHaveBeenCalledTimes(1);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: teamBuilderKeys.all,
    });
  });

  it("trả về cùng một hàm qua các lần render", () => {
    // use-deadline-refresh puts this function in a useEffect dependency: an identity that changes on
    // every render means the setTimeout is reset and the deadline never arrives.
    const { result, rerender } = renderInvalidate("attendance-window");
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
  });
});
