// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
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

let weekSessions: BattleSession[] = [SESSION];
let pickedSession: BattleSession | null = null;

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
  useSessionFilter: () => ({
    sessions: weekSessions,
    selectedSession: pickedSession,
  }),
  useCharacters: () => ({ data: CHARACTERS }),
}));
// The chart itself is recharts in an SVG; what is under test is who it counts.
vi.mock("../components/attendance-summary-card", () => ({
  AttendanceSummaryCard: ({
    rows,
    session,
  }: {
    rows: ClassAttendanceSummary[];
    session: BattleSession;
  }) => (
    <div data-testid="summary-card" data-session={session.id}>
      {rows.reduce((sum, row) => sum + row.total, 0)}
    </div>
  ),
}));

import { AttendanceSummaryDashboard } from "../components/attendance-summary-dashboard";
import { useAttendanceFilterStore } from "../store/attendance-filter-store";

afterEach(cleanup);

beforeEach(() => {
  weekSessions = [SESSION];
  pickedSession = null;
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

describe("AttendanceSummaryDashboard - trận đã đánh", () => {
  // Wednesday noon: Monday's and Tuesday's battles are over, Thursday's is still to come.
  const NOW = new Date("2026-08-26T12:00:00.000Z");

  /**
   * Build a battle at the given time.
   * @param id - Session id
   * @param dateTime - Battle time (ISO)
   * @returns The session
   */
  function battleAt(id: string, dateTime: string): BattleSession {
    return { ...SESSION, id, label: `Trận ${id}`, dateTime };
  }

  /**
   * The sessions whose summary card is on screen, in order.
   * @returns The session ids
   */
  function shownCards(): (string | null)[] {
    return screen
      .queryAllByTestId("summary-card")
      .map((card) => card.getAttribute("data-session"));
  }

  /**
   * The bar that folds the fought battles.
   * @returns The bar button, or null when there is none
   */
  function foughtBar(): HTMLElement | null {
    return screen.queryByRole("button", { name: /^Đã đánh ·/ });
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    vi.setSystemTime(NOW);
    weekSessions = [
      battleAt("mon", "2026-08-24T20:00:00.000Z"),
      battleAt("tue", "2026-08-25T20:00:00.000Z"),
      battleAt("thu", "2026-08-27T20:00:00.000Z"),
    ];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("card trận đã đánh thu vào thanh, mở ra thì hiện lại", () => {
    render(<AttendanceSummaryDashboard />);

    expect(shownCards()).toEqual(["thu"]);
    expect(foughtBar()?.textContent).toContain("Đã đánh · 2 trận");

    fireEvent.click(foughtBar() as HTMLElement);

    expect(shownCards()).toEqual(["thu", "mon", "tue"]);
  });

  // A past week is all fought, so nothing is folded away.
  it("cả tuần đã đánh xong thì hiện đầy đủ, không có thanh", () => {
    vi.setSystemTime(new Date("2026-08-31T12:00:00.000Z"));

    render(<AttendanceSummaryDashboard />);

    expect(shownCards()).toEqual(["mon", "tue", "thu"]);
    expect(foughtBar()).toBeNull();
  });

  it("chưa có trận nào đã đánh thì không có thanh", () => {
    vi.setSystemTime(new Date("2026-08-23T12:00:00.000Z"));

    render(<AttendanceSummaryDashboard />);

    expect(shownCards()).toEqual(["mon", "tue", "thu"]);
    expect(foughtBar()).toBeNull();
  });

  it("chọn một trận đã đánh ở ô Ngày đánh thì luôn hiện trận đó", () => {
    pickedSession = weekSessions[0];

    render(<AttendanceSummaryDashboard />);

    expect(shownCards()).toEqual(["mon"]);
    expect(foughtBar()).toBeNull();
  });

  it("tới giờ đánh khi trang đang mở thì card tự chuyển vào thanh", () => {
    weekSessions = [...weekSessions, battleAt("fri", "2026-08-28T20:00:00.000Z")];

    render(<AttendanceSummaryDashboard />);
    expect(shownCards()).toEqual(["thu", "fri"]);

    act(() => {
      vi.advanceTimersByTime(
        new Date("2026-08-27T20:00:01.000Z").getTime() - NOW.getTime()
      );
    });

    expect(shownCards()).toEqual(["fri"]);
    expect(foughtBar()?.textContent).toContain("Đã đánh · 3 trận");
  });
});
