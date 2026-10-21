// @vitest-environment jsdom
import { act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderQueryHook } from "@/lib/__tests__/render-query-hook";

const api = vi.hoisted(() => ({
  fetchAttendanceRecords: vi.fn(),
  fetchBattleSessions: vi.fn(),
  fetchCharacters: vi.fn(),
  fetchCurrentWeek: vi.fn(),
  markAttendance: vi.fn(),
}));
const invalidate = vi.hoisted(() => vi.fn());

vi.mock("../../api/attendance-api", () => api);
vi.mock("@/hooks/use-invalidate", () => ({ useInvalidate: () => invalidate }));

import { useAttendanceFilterStore } from "../../store/attendance-filter-store";
import {
  useAttendanceRecords,
  useBattleSessions,
  useCharacters,
  useCurrentWeek,
  useFilteredCharacters,
  useHistoryWeek,
  useMarkAttendance,
  useSessionFilter,
} from "../use-attendance";

const CURRENT_WEEK = "2026-07-19T17:00:00.000Z";
const SESSIONS = [{ id: "s1" }, { id: "s2" }];

beforeEach(() => {
  useAttendanceFilterStore.setState(useAttendanceFilterStore.getInitialState());
  api.fetchCurrentWeek.mockResolvedValue({
    ok: true,
    data: { weekStart: CURRENT_WEEK },
  });
  api.fetchBattleSessions.mockResolvedValue({ ok: true, data: SESSIONS });
  api.fetchCharacters.mockResolvedValue({
    ok: true,
    data: [
      { id: "c1", name: "An", guildClass: "mingyi" },
      { id: "c2", name: "Bình", guildClass: "xuyetam" },
    ],
  });
  api.fetchAttendanceRecords.mockResolvedValue({ ok: true, data: {} });
});

describe("attendance queries", () => {
  it("unwrap each action's data", async () => {
    const { result } = renderQueryHook(() => ({
      characters: useCharacters(),
      week: useCurrentWeek(),
      records: useAttendanceRecords("w1"),
      sessions: useBattleSessions("w1"),
    }));

    await waitFor(() => expect(result.current.sessions.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.records.isSuccess).toBe(true));
    expect(result.current.sessions.data).toEqual(SESSIONS);
    expect(api.fetchBattleSessions).toHaveBeenCalledWith("w1");
    expect(api.fetchAttendanceRecords).toHaveBeenCalledWith("w1");
  });

  it("reject with the backend's message when an action fails", async () => {
    api.fetchBattleSessions.mockResolvedValue({
      ok: false,
      message: "Hết phiên",
      statusCode: 401,
    });

    const { result } = renderQueryHook(() => useBattleSessions());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Hết phiên");
  });
});

describe("useFilteredCharacters", () => {
  it("is empty until the characters load, then follows the scope's filter", async () => {
    const { result } = renderQueryHook(() => useFilteredCharacters("attendance"));
    expect(result.current).toEqual([]);

    await waitFor(() => expect(result.current).toHaveLength(2));

    act(() =>
      useAttendanceFilterStore
        .getState()
        .setFilter("attendance", { search: "bình", guildClasses: [] })
    );

    await waitFor(() => expect(result.current.map((c) => c.id)).toEqual(["c2"]));
  });
});

describe("useHistoryWeek", () => {
  it("offers no options before the open week loads", () => {
    const { result } = renderQueryHook(() => useHistoryWeek());

    expect(result.current.options).toEqual([]);
    expect(result.current.selected).toBeNull();
    expect(result.current.weekStart).toBeNull();
  });

  it("sends the open week as no week", async () => {
    const { result } = renderQueryHook(() => useHistoryWeek());

    await waitFor(() => expect(result.current.options.length).toBeGreaterThan(0));
    act(() => result.current.setWeekStart(result.current.options[0].weekStart));

    await waitFor(() => expect(result.current.selected?.isCurrent).toBe(true));
    expect(result.current.weekStart).toBeNull();
  });

  it("sends an earlier week's marker", async () => {
    const { result } = renderQueryHook(() => useHistoryWeek());

    await waitFor(() => expect(result.current.options.length).toBeGreaterThan(1));
    const earlier = result.current.options[1].weekStart;
    act(() => result.current.setWeekStart(earlier));

    await waitFor(() => expect(result.current.weekStart).toBe(earlier));
  });

  it("resolves a stored week that is no longer offered to the open week", async () => {
    useAttendanceFilterStore.setState({ weekStart: "2020-01-01T00:00:00.000Z" });

    const { result } = renderQueryHook(() => useHistoryWeek());

    await waitFor(() => expect(result.current.options.length).toBeGreaterThan(0));
    expect(result.current.selected).toBeNull();
    expect(result.current.weekStart).toBeNull();
  });
});

describe("useSessionFilter", () => {
  it("resolves the stored session against the loaded ones", async () => {
    useAttendanceFilterStore.setState({ sessionId: "s2" });

    const { result } = renderQueryHook(() => useSessionFilter());

    expect(result.current.sessions).toEqual([]);
    await waitFor(() => expect(result.current.selectedSession).toEqual({ id: "s2" }));
  });

  it("resolves a deleted session to every session", async () => {
    useAttendanceFilterStore.setState({ sessionId: "gone" });

    const { result } = renderQueryHook(() => useSessionFilter());

    await waitFor(() => expect(result.current.sessions).toHaveLength(2));
    expect(result.current.selectedSession).toBeNull();
  });
});

describe("useMarkAttendance", () => {
  it("invalidates after a successful mark", async () => {
    api.markAttendance.mockResolvedValue({ ok: true, data: { sessionId: "s1" } });
    const { result } = renderQueryHook(() => useMarkAttendance());

    await act(() =>
      result.current.mutateAsync({ characterId: "c1", sessionId: "s1", isPresent: true })
    );

    expect(invalidate).toHaveBeenCalled();
  });

  it("rejects with the backend's message and does not invalidate", async () => {
    api.markAttendance.mockResolvedValue({
      ok: false,
      message: "Quá hạn",
      statusCode: 400,
    });
    const { result } = renderQueryHook(() => useMarkAttendance());

    await expect(
      act(() =>
        result.current.mutateAsync({ characterId: "c1", sessionId: "s1", isPresent: true })
      )
    ).rejects.toThrow("Quá hạn");
    expect(invalidate).not.toHaveBeenCalled();
  });
});
