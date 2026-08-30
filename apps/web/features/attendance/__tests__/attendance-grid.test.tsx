// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BattleSession } from "@guild/shared/schemas";

const boardState = {
  isPending: true,
  isError: false,
  errorMessage: "",
  refetch: vi.fn(),
};
let sessions: BattleSession[] = [];

/** Stable identity: `useTablePagination` resets page whenever `resetKey` changes by reference. */
const NO_CHARACTERS: never[] = [];

vi.mock("../hooks/use-attendance-board", () => ({
  useAttendanceBoard: () => boardState,
}));
vi.mock("../hooks/use-deadline-refresh", () => ({
  useDeadlineRefresh: () => {},
}));
vi.mock("../hooks/use-attendance", () => ({
  useFilteredCharacters: () => NO_CHARACTERS,
  useBattleSessions: () => ({ data: sessions }),
  useAttendanceRecords: () => ({ data: {} }),
  useMarkAttendance: () => ({ mutateAsync: vi.fn(), error: null }),
}));

import { AttendanceGrid } from "../components/attendance-grid";

afterEach(cleanup);

/**
 * Build a battle session with only the fields the header reads.
 * @param id - Session id, also used to build its label
 * @returns A battle session shaped for the header
 */
function makeSession(id: string): BattleSession {
  return {
    id,
    label: `Trận ${id}`,
    dateTime: "2026-08-24T20:00:00.000Z",
    deadline: "2026-08-24T03:00:00.000Z",
    isDeadlinePassed: false,
    isGuildWar: false,
    opponent: null,
    weekStart: "2026-08-24T00:00:00.000Z",
    attendanceCount: 0,
    hasFormation: false,
  };
}

describe("AttendanceGrid", () => {
  beforeEach(() => {
    sessions = [];
    boardState.isPending = true;
  });

  it("số cột header không đổi giữa lúc tải và lúc có 4 trận", () => {
    const { container, rerender } = render(<AttendanceGrid isAdmin />);
    const headerCount = () => container.querySelectorAll("thead th").length;

    const whilePending = headerCount();

    boardState.isPending = false;
    sessions = ["a", "b", "c", "d"].map(makeSession);
    rerender(<AttendanceGrid isAdmin />);

    expect(headerCount()).toBe(whilePending);
    expect(whilePending).toBe(6);
  });

  it("admin có cột thao tác, member thì không", () => {
    boardState.isPending = false;
    sessions = ["a", "b", "c", "d"].map(makeSession);

    const { container, rerender } = render(<AttendanceGrid isAdmin />);
    const headerCount = () => container.querySelectorAll("thead th").length;

    expect(headerCount()).toBe(6);
    expect(screen.queryByRole("columnheader", { name: "Điểm danh" })).not.toBeNull();

    rerender(<AttendanceGrid isAdmin={false} />);

    expect(headerCount()).toBe(5);
    expect(screen.queryByRole("columnheader", { name: "Điểm danh" })).toBeNull();
  });
});
