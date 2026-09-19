// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GuildClass } from "@guild/shared/enums";
import type { BattleSession, Character } from "@guild/shared/schemas";

import type { ClassAttendanceSummary } from "../lib/attendance-summary";

const CHARACTERS: Character[] = [
  { id: "char-1", name: "Mèo Mập", guildClass: GuildClass.CUU_LINH },
  { id: "char-2", name: "Mèo Gầy", guildClass: GuildClass.HUYET_HA },
];

const SESSION: BattleSession = {
  id: "sess-1",
  label: "Trận sess-1",
  dateTime: "2026-08-24T20:00:00.000Z",
  deadline: "2026-08-24T03:00:00.000Z",
  isAttendanceClosed: false,
  canReopenAttendance: false,
  isGuildWar: false,
  opponent: null,
  weekStart: "2026-08-24T00:00:00.000Z",
  attendanceCount: 0,
  matchCount: 2,
  formationMatchCount: 0,
};

vi.mock("../hooks/use-attendance-board", () => ({
  useAttendanceBoard: () => ({
    isPending: false,
    isError: false,
    errorMessage: "",
    refetch: vi.fn(),
  }),
}));
vi.mock("../hooks/use-attendance", () => ({
  useHistoryWeek: () => ({ weekStart: null }),
  useAttendanceRecords: () => ({ data: {} }),
  useSessionFilter: () => ({ sessions: [SESSION], selectedSession: null }),
  useCharacters: () => ({ data: CHARACTERS }),
}));
// The chart itself is recharts in an SVG; what is under test is who it counts.
vi.mock("../components/attendance-summary-card", () => ({
  AttendanceSummaryCard: ({ rows }: { rows: ClassAttendanceSummary[] }) => (
    <div data-testid="summary-card">
      {rows.reduce((sum, row) => sum + row.total, 0)}
    </div>
  ),
}));

import { AttendanceSummaryDashboard } from "../components/attendance-summary-dashboard";
import { useAttendanceFilterStore } from "../store/attendance-filter-store";

afterEach(cleanup);

beforeEach(() => {
  useAttendanceFilterStore.setState({
    filters: {
      attendance: { search: "", guildClasses: [] },
      history: { search: "", guildClasses: [] },
    },
  });
});

describe("AttendanceSummaryDashboard", () => {
  // The chart answers "how much of the guild turned up, split by class"; the per-person filters
  // live in the table below.
  it("đang tìm một cái tên hay lọc một lưu phái thì biểu đồ vẫn tính cả bang", () => {
    useAttendanceFilterStore.setState({
      filters: {
        attendance: { search: "", guildClasses: [] },
        history: { search: "không ai tên thế này", guildClasses: [GuildClass.TO_VAN] },
      },
    });

    render(<AttendanceSummaryDashboard />);

    expect(screen.getByTestId("summary-card").textContent).toBe("2");
  });
});
