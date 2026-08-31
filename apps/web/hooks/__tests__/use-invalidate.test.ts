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
  it("invalidate đúng từng key của chủ đề", async () => {
    const { result, invalidateSpy } = renderInvalidate("schedule");

    await result.current();

    expect(invalidateSpy).toHaveBeenCalledTimes(5);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: settingsKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: attendanceKeys.sessions(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: attendanceKeys.records(),
    });
    // The sign-up tallies are counted from the records, so a schedule change makes them stale too.
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: attendanceKeys.summary(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: teamBuilderKeys.all,
    });
  });

  it("chủ đề hẹp chỉ invalidate một key", async () => {
    const { result, invalidateSpy } = renderInvalidate("formation");

    await result.current();

    expect(invalidateSpy).toHaveBeenCalledTimes(1);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: teamBuilderKeys.all,
    });
  });

  it("chỉ resolve sau khi mọi invalidation xong", async () => {
    // Đây là hợp đồng khiến mutation giữ trạng thái pending tới lúc dữ liệu mới về: onSuccess trả
    // promise này, nên spinner còn quay thay vì tắt sớm rồi để màn hình đứng im với dữ liệu cũ.
    const { result, invalidateSpy } = renderInvalidate("attendance");
    let finishInvalidation = () => {};
    invalidateSpy.mockReturnValue(
      new Promise<void>((resolve) => {
        finishInvalidation = resolve;
      })
    );

    let isSettled = false;
    const pending = result.current().then(() => {
      isSettled = true;
    });

    await Promise.resolve();
    expect(isSettled).toBe(false);

    finishInvalidation();
    await pending;
    expect(isSettled).toBe(true);
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
