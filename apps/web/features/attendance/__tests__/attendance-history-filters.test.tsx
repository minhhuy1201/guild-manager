// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GuildClass } from "@guild/shared/enums";
import type { BattleSession } from "@guild/shared/schemas";

import type { RosterFilter } from "@/lib/roster-filter";
import type { AttendancePresenceFilter } from "../lib/presence-filter";

let sessions: BattleSession[] = [];

vi.mock("../hooks/use-attendance", async () => {
  const { useAttendanceFilterStore } = await import(
    "../store/attendance-filter-store"
  );

  return {
    /** The real store wiring, with only the query behind it replaced. */
    useSessionFilter: () => {
      const sessionId = useAttendanceFilterStore((s) => s.sessionId);
      const setSessionId = useAttendanceFilterStore((s) => s.setSessionId);

      return {
        sessions,
        selectedSession:
          sessions.find((session) => session.id === sessionId) ?? null,
        setSessionId,
      };
    },
  };
});

import { AttendanceHistoryFilters } from "../components/attendance-history-filters";
import { useAttendanceFilterStore } from "../store/attendance-filter-store";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

/** A battle session with only the fields the picker reads. */
const SESSION: BattleSession = {
  id: "sess-1",
  label: "Trận thứ 3",
  dateTime: "2026-08-24T20:00:00.000Z",
  deadline: "2026-08-24T03:00:00.000Z",
  isDeadlinePassed: false,
  isGuildWar: false,
  opponent: null,
  weekStart: "2026-08-24T00:00:00.000Z",
  attendanceCount: 0,
  matchCount: 2,
  formationMatchCount: 0,
};

/** No filter at all — the shape both scopes start from. */
const EMPTY_FILTER: RosterFilter = { search: "", guildClasses: [] };

/** The empty state every test starts from. */
const EMPTY_STATE = {
  filters: { attendance: EMPTY_FILTER, history: EMPTY_FILTER },
  presence: "all" as AttendancePresenceFilter,
  sessionId: null as string | null,
};

/** The "Xoá bộ lọc" button. */
function clearAll(): HTMLButtonElement {
  return screen.getByText("Xoá bộ lọc").closest("button") as HTMLButtonElement;
}

/** The store slice the History screen owns. */
function historyState() {
  const { filters, presence, sessionId } = useAttendanceFilterStore.getState();

  return { filter: filters.history, presence, sessionId };
}

afterEach(cleanup);

describe("AttendanceHistoryFilters - xoá bộ lọc", () => {
  beforeEach(() => {
    sessions = [SESSION];
    useAttendanceFilterStore.setState(EMPTY_STATE);
  });

  it("chưa lọc gì thì nút bị khoá, không mời gọi bấm vào chỗ trống", () => {
    render(<AttendanceHistoryFilters />);

    expect(clearAll().disabled).toBe(true);
  });

  it("nút vẫn hiện khi bị khoá, để thẻ lọc không đổi chiều cao lúc gõ chữ đầu", () => {
    render(<AttendanceHistoryFilters />);

    expect(clearAll()).not.toBeNull();
  });

  it("có từ khoá là nút mở khoá", () => {
    useAttendanceFilterStore.setState({
      filters: {
        ...EMPTY_STATE.filters,
        history: { search: "mèo", guildClasses: [] },
      },
    });

    render(<AttendanceHistoryFilters />);

    expect(clearAll().disabled).toBe(false);
  });

  it("chọn lưu phái là nút mở khoá", () => {
    useAttendanceFilterStore.setState({
      filters: {
        ...EMPTY_STATE.filters,
        history: { search: "", guildClasses: [GuildClass.CUU_LINH] },
      },
    });

    render(<AttendanceHistoryFilters />);

    expect(clearAll().disabled).toBe(false);
  });

  it("chọn trạng thái là nút mở khoá", () => {
    useAttendanceFilterStore.setState({ presence: "present" });

    render(<AttendanceHistoryFilters />);

    expect(clearAll().disabled).toBe(false);
  });

  it("chọn ngày đánh là nút mở khoá", () => {
    useAttendanceFilterStore.setState({ sessionId: SESSION.id });

    render(<AttendanceHistoryFilters />);

    expect(clearAll().disabled).toBe(false);
  });

  it("ngày đánh đã bị xoá thì nút vẫn khoá — trên màn hình nó đang là Tất cả", () => {
    useAttendanceFilterStore.setState({ sessionId: "sess-deleted" });

    render(<AttendanceHistoryFilters />);

    expect(clearAll().disabled).toBe(true);
  });

  it("một cú bấm xoá cả bốn thứ cùng lúc", async () => {
    useAttendanceFilterStore.setState({
      filters: {
        ...EMPTY_STATE.filters,
        history: { search: "mèo", guildClasses: [GuildClass.CUU_LINH] },
      },
      presence: "absent",
      sessionId: SESSION.id,
    });

    render(<AttendanceHistoryFilters />);
    await act(async () => {
      fireEvent.click(clearAll());
    });

    expect(historyState()).toEqual({
      filter: { search: "", guildClasses: [] },
      presence: "all",
      sessionId: null,
    });
  });

  it("xoá bộ lọc của Lịch sử không đụng tới bộ lọc của màn Điểm danh", async () => {
    useAttendanceFilterStore.setState({
      filters: {
        attendance: { search: "giữ nguyên", guildClasses: [GuildClass.TO_VAN] },
        history: { search: "mèo", guildClasses: [] },
      },
    });

    render(<AttendanceHistoryFilters />);
    await act(async () => {
      fireEvent.click(clearAll());
    });

    expect(useAttendanceFilterStore.getState().filters.attendance).toEqual({
      search: "giữ nguyên",
      guildClasses: [GuildClass.TO_VAN],
    });
  });

  it("chưa lọc ngày đánh thì không có nút xoá riêng của nó", () => {
    render(<AttendanceHistoryFilters />);

    expect(screen.queryByLabelText("Xoá lọc ngày đánh")).toBeNull();
  });

  it("bấm X của ngày đánh thì chỉ ngày đánh trở lại Tất cả", async () => {
    useAttendanceFilterStore.setState({
      presence: "absent",
      sessionId: SESSION.id,
    });

    render(<AttendanceHistoryFilters />);
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Xoá lọc ngày đánh"));
    });

    expect(historyState().sessionId).toBeNull();
    expect(historyState().presence).toBe("absent");
  });

  it("chưa lọc trạng thái thì không có nút xoá riêng của nó", () => {
    render(<AttendanceHistoryFilters />);

    expect(screen.queryByLabelText("Xoá lọc trạng thái")).toBeNull();
  });

  it("bấm X của trạng thái thì chỉ trạng thái trở lại Tất cả", async () => {
    useAttendanceFilterStore.setState({
      presence: "present",
      sessionId: SESSION.id,
    });

    render(<AttendanceHistoryFilters />);
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Xoá lọc trạng thái"));
    });

    expect(historyState().presence).toBe("all");
    expect(historyState().sessionId).toBe(SESSION.id);
  });

  it("ngày đánh đã bị xoá thì cũng không có X — trên màn hình nó đang là Tất cả", () => {
    useAttendanceFilterStore.setState({ sessionId: "sess-deleted" });

    render(<AttendanceHistoryFilters />);

    expect(screen.queryByLabelText("Xoá lọc ngày đánh")).toBeNull();
  });
});
