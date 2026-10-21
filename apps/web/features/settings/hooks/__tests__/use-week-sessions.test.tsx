// @vitest-environment jsdom
import { waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderQueryHook } from "@/lib/__tests__/render-query-hook";

const api = vi.hoisted(() => ({
  fetchSettingsWeeks: vi.fn(),
  fetchWeekSessions: vi.fn(),
}));

vi.mock("../../api/battle-sessions-api", () => api);

import { useSettingsWeeks, useWeekSessions } from "../use-week-sessions";

describe("settings week queries", () => {
  it("reads the schedulable weeks", async () => {
    api.fetchSettingsWeeks.mockResolvedValue({ ok: true, data: [{ weekStart: "w1" }] });

    const { result } = renderQueryHook(() => useSettingsWeeks());

    await waitFor(() => expect(result.current.data).toEqual([{ weekStart: "w1" }]));
  });

  it("reads one week's sessions", async () => {
    api.fetchWeekSessions.mockResolvedValue({ ok: true, data: [{ id: "s1" }] });

    const { result } = renderQueryHook(() => useWeekSessions("w1"));

    await waitFor(() => expect(result.current.data).toEqual([{ id: "s1" }]));
    expect(api.fetchWeekSessions).toHaveBeenCalledWith("w1");
  });

  it("errors with the backend's message", async () => {
    api.fetchWeekSessions.mockResolvedValue({ ok: false, message: "Lỗi", statusCode: 500 });

    const { result } = renderQueryHook(() => useWeekSessions());

    await waitFor(() => expect(result.current.error?.message).toBe("Lỗi"));
  });
});
