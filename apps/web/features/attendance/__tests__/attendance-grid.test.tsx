// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GuildClass } from "@guild/shared/enums";
import type {
  AttendanceRecord,
  BattleSession,
  Character,
} from "@guild/shared/schemas";

import { toastSuccess } from "@/components/shared/toast";
import { ApiError } from "@/lib/api-client";
import { recordKey } from "../lib/record-key";
import { useAttendanceFilterStore } from "../store/attendance-filter-store";

const boardState = {
  isPending: false,
  isError: false,
  errorMessage: "",
  refetch: vi.fn(),
};
let sessions: BattleSession[] = [];
let roster: Character[] = [];
let filtered: Character[] = [];
let records: Record<string, AttendanceRecord> = {};
const mutateAsync = vi.fn();

vi.mock("../hooks/use-attendance-board", () => ({
  useAttendanceBoard: () => boardState,
}));
vi.mock("../hooks/use-deadline-refresh", () => ({
  useDeadlineRefresh: () => {},
}));
vi.mock("../hooks/use-attendance", () => ({
  useFilteredCharacters: () => filtered,
  useCharacters: () => ({ data: roster }),
  useBattleSessions: () => ({ data: sessions }),
  useAttendanceRecords: () => ({ data: records }),
  useMarkAttendance: () => ({ mutateAsync }),
}));

// The write protocol recovers an expired session by navigating, which needs a router; these suites
// render outside one.
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components/shared/toast", () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

import { AttendanceGrid } from "../components/attendance-grid";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/**
 * Build a battle session with only the fields the grid reads.
 * @param id - Session id, also used to build its label
 * @returns A battle session
 */
function makeSession(id: string): BattleSession {
  return {
    id,
    label: `Trận ${id}`,
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
}

/**
 * Build a guild member.
 * @param id - Character id, also used to build the name
 * @returns The character
 */
function makeCharacter(id: string): Character {
  return { id, name: `Người ${id}`, guildClass: GuildClass.CUU_LINH };
}

/**
 * Build one recorded answer.
 * @param characterId - Who answered
 * @param sessionId - Which battle
 * @param isPresent - The answer
 * @returns The record map entry
 */
function makeRecord(
  characterId: string,
  sessionId: string,
  isPresent: boolean
): Record<string, AttendanceRecord> {
  return {
    [recordKey(characterId, sessionId)]: {
      characterId,
      sessionId,
      isPresent,
      markedAt: "2026-08-24T10:00:00.000Z",
      reason: null,
      source: "answer",
    },
  };
}

/**
 * The clickable cell of one character on the first battle.
 * @param characterId - Whose cell
 * @returns The cell button
 */
function cell(characterId: string): HTMLButtonElement {
  return screen.getByRole("button", {
    name: new RegExp(`^Người ${characterId}, Trận a`),
  }) as HTMLButtonElement;
}

beforeEach(() => {
  // jsdom has no matchMedia. Reduced motion keeps the totals' count-up out of the way: the cells
  // read their final numbers at once.
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  boardState.isPending = false;
  sessions = [makeSession("a")];
  roster = [makeCharacter("1"), makeCharacter("2")];
  filtered = roster;
  records = {};
  mutateAsync.mockReset();
  mutateAsync.mockResolvedValue(undefined);
  useAttendanceFilterStore.setState({ unansweredOnly: false, showFought: false });
});

describe("AttendanceGrid - bố cục", () => {
  it("số cột header không đổi giữa lúc tải và lúc có 4 trận", () => {
    boardState.isPending = true;
    sessions = [];
    const { container, rerender } = render(<AttendanceGrid canManageOthers />);
    const headerCount = () => container.querySelectorAll("thead th").length;

    const whilePending = headerCount();

    boardState.isPending = false;
    sessions = ["a", "b", "c", "d"].map(makeSession);
    rerender(<AttendanceGrid canManageOthers />);

    expect(headerCount()).toBe(whilePending);
    expect(whilePending).toBe(5);
  });

  it("nhiều trận: mỗi trận một cột header, và số cột bằng số th", () => {
    sessions = ["a", "b", "c", "d"].map(makeSession);

    const { container } = render(<AttendanceGrid canManageOthers={false} />);

    const heads = container.querySelectorAll("thead th");
    expect(heads).toHaveLength(5);

    const headerRows = container.querySelectorAll("thead tr");
    const totalsRow = headerRows[headerRows.length - 1];
    const bodyRow = container.querySelector("tbody tr");
    expect(totalsRow.children).toHaveLength(heads.length);
    expect(bodyRow?.children).toHaveLength(heads.length);
    for (const id of ["a", "b", "c", "d"]) {
      expect(screen.getByText(`Trận ${id}`)).toBeTruthy();
    }
  });

  // The actions column on the right is gone, giving the room back to the day columns.
  it("không còn cột Điểm danh, kể cả với admin", () => {
    render(<AttendanceGrid canManageOthers />);

    expect(screen.queryByRole("columnheader", { name: "Điểm danh" })).toBeNull();
  });

  // The filters live inside the card they filter rather than standing as a separate block above.
  it("thanh lọc nằm trong card của bảng", () => {
    render(<AttendanceGrid canManageOthers={false} />);

    const card = screen
      .getByText("Điểm danh theo ngày đánh")
      .closest("[data-slot=card]") as HTMLElement;

    expect(card.querySelector("#attendance-search")).not.toBeNull();
    expect(card.querySelector("[aria-pressed]")?.textContent).toContain(
      "Chưa điểm danh"
    );
  });

  // The guild has a few dozen people: 10 rows per page makes an admin page through constantly.
  it("mở ra 50 dòng mỗi trang", () => {
    filtered = Array.from({ length: 60 }, (_, index) =>
      makeCharacter(String(index + 1))
    );

    const { container } = render(<AttendanceGrid canManageOthers />);

    expect(container.querySelectorAll("tbody tr").length).toBe(50);
  });
});

describe("AttendanceGrid - hàng tổng", () => {
  it("mỗi ngày đếm Có, Không, Chưa trên toàn bang, không theo bộ lọc", () => {
    roster = [makeCharacter("1"), makeCharacter("2"), makeCharacter("3")];
    filtered = [roster[0]];
    records = { ...makeRecord("1", "a", true), ...makeRecord("2", "a", false) };

    render(<AttendanceGrid canManageOthers={false} />);

    expect(
      screen.getByLabelText("Trận a: 1 Có, 1 Không, 1 chưa điểm danh")
    ).toBeTruthy();
  });
});

describe("AttendanceGrid - lọc Chưa điểm danh", () => {
  it("chỉ giữ người còn trận mở chưa trả lời", () => {
    records = makeRecord("1", "a", true);
    useAttendanceFilterStore.setState({ unansweredOnly: true });

    render(<AttendanceGrid canManageOthers={false} />);

    expect(screen.queryByText("Người 1")).toBeNull();
    expect(screen.getByText("Người 2")).toBeTruthy();
  });
});

describe("AttendanceGrid - phân trang khi đang lọc", () => {
  // After a save the records reload as new objects, even when the people in the filtered list are
  // unchanged.
  it("tải lại bản ghi mà danh sách lọc vẫn là những người cũ thì không nhảy về trang 1", () => {
    filtered = Array.from({ length: 60 }, (_, index) =>
      makeCharacter(String(index + 1))
    );
    roster = filtered;
    useAttendanceFilterStore.setState({ unansweredOnly: true });
    const { rerender } = render(<AttendanceGrid canManageOthers={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Trang sau" }));
    expect(screen.getByText("Người 51")).toBeTruthy();

    records = { ...records };
    rerender(<AttendanceGrid canManageOthers={false} />);

    expect(screen.getByText("Người 51")).toBeTruthy();
  });
});

describe("AttendanceGrid - admin bấm thẳng vào ô", () => {
  it("bấm xoay vòng Có, Không, rồi lại Có", () => {
    render(<AttendanceGrid canManageOthers />);

    fireEvent.click(cell("1"));
    expect(cell("1").getAttribute("aria-label")).toContain(": Có");
    fireEvent.click(cell("1"));
    expect(cell("1").getAttribute("aria-label")).toContain(": Không");
    fireEvent.click(cell("1"));
    expect(cell("1").getAttribute("aria-label")).toContain(": Có");
  });

  it("thanh dưới đếm số ô đã đổi, Huỷ bỏ hết", () => {
    render(<AttendanceGrid canManageOthers />);

    fireEvent.click(cell("1"));
    fireEvent.click(cell("2"));
    expect(screen.getByText("2 ô đã đổi")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Huỷ/ }));

    expect(screen.queryByText("2 ô đã đổi")).toBeNull();
    expect(cell("1").dataset.changed).toBe("false");
  });

  it("Lưu gửi mọi ô đã đổi một lần, xong thì hết nháp", async () => {
    render(<AttendanceGrid canManageOthers />);
    fireEvent.click(cell("1"));
    fireEvent.click(cell("2"));
    fireEvent.click(cell("2"));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^Lưu$/ }));
    });

    expect(mutateAsync).toHaveBeenCalledTimes(2);
    expect(mutateAsync).toHaveBeenCalledWith({
      characterId: "1",
      sessionId: "a",
      isPresent: true,
    });
    expect(mutateAsync).toHaveBeenCalledWith({
      characterId: "2",
      sessionId: "a",
      isPresent: false,
    });
    expect(screen.queryByText(/ô đã đổi/)).toBeNull();
    expect(toastSuccess).toHaveBeenCalledWith("Đã lưu 2 thay đổi điểm danh.");
  });

  it("lưu lỗi một phần thì giữ lại đúng ô lỗi và báo lỗi", async () => {
    mutateAsync
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new ApiError("Máy chủ bận.", 500));
    render(<AttendanceGrid canManageOthers />);
    fireEvent.click(cell("1"));
    fireEvent.click(cell("2"));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^Lưu$/ }));
    });

    expect(screen.getByText("Máy chủ bận.")).toBeTruthy();
    expect(cell("1").dataset.changed).toBe("false");
    expect(cell("2").dataset.changed).toBe("true");
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("còn nháp thì rời trang phải được hỏi lại", () => {
    render(<AttendanceGrid canManageOthers />);
    fireEvent.click(cell("1"));

    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("member không bấm được ô nào", () => {
    render(<AttendanceGrid canManageOthers={false} />);

    expect(screen.queryAllByRole("button", { name: /Trận a/ })).toHaveLength(0);
  });
});

describe("AttendanceGrid - trận đã đánh", () => {
  // Wednesday noon: Monday's and Tuesday's battles are over, Thursday's is still to come.
  const NOW = new Date("2026-08-26T12:00:00.000Z");

  /**
   * Build a battle at the given time.
   * @param id - Session id
   * @param dateTime - Battle time (ISO)
   * @returns The session
   */
  function battleAt(id: string, dateTime: string): BattleSession {
    return { ...makeSession(id), dateTime };
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    vi.setSystemTime(NOW);
    sessions = [
      battleAt("a", "2026-08-24T20:00:00.000Z"),
      battleAt("b", "2026-08-25T20:00:00.000Z"),
      battleAt("c", "2026-08-27T20:00:00.000Z"),
    ];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("mặc định chỉ có cột trận sắp tới, hàng tổng theo cột đang hiện", () => {
    const { container } = render(<AttendanceGrid canManageOthers />);

    expect(screen.queryByText("Trận a")).toBeNull();
    expect(screen.queryByText("Trận b")).toBeNull();
    expect(screen.getByText("Trận c")).toBeTruthy();
    expect(container.querySelectorAll("thead tr:first-child th")).toHaveLength(2);
    expect(container.querySelectorAll("thead tr:nth-child(2) td")).toHaveLength(2);
  });

  it("nút Đã đánh ghi số cột ẩn, bật thì cột và số tổng của chúng hiện lại", () => {
    const { container } = render(<AttendanceGrid canManageOthers />);

    fireEvent.click(screen.getByRole("button", { name: /^Đã đánh \(2\)/ }));

    expect(screen.getByText("Trận a")).toBeTruthy();
    expect(screen.getByText("Trận b")).toBeTruthy();
    expect(container.querySelectorAll("thead tr:first-child th")).toHaveLength(4);
    expect(container.querySelectorAll("thead tr:nth-child(2) td")).toHaveLength(4);
  });

  it("chưa có trận nào đã đánh thì không có nút", () => {
    vi.setSystemTime(new Date("2026-08-23T12:00:00.000Z"));

    render(<AttendanceGrid canManageOthers />);

    expect(screen.queryByRole("button", { name: /^Đã đánh/ })).toBeNull();
    expect(screen.getByText("Trận a")).toBeTruthy();
  });

  it("tất cả đã đánh thì hiện hết cột, không có nút", () => {
    vi.setSystemTime(new Date("2026-08-28T12:00:00.000Z"));

    render(<AttendanceGrid canManageOthers />);

    expect(screen.queryByRole("button", { name: /^Đã đánh/ })).toBeNull();
    expect(screen.getByText("Trận a")).toBeTruthy();
    expect(screen.getByText("Trận c")).toBeTruthy();
  });

  // The save bar counts the whole draft; a change in a column that is folded away must say so, or
  // the bar shows a number with nothing on screen behind it.
  it("sửa một ô ở cột đã đánh rồi ẩn cột đi thì thanh lưu nói rõ ô đó đang ẩn", () => {
    render(<AttendanceGrid canManageOthers />);
    fireEvent.click(screen.getByRole("button", { name: /^Đã đánh \(2\)/ }));
    fireEvent.click(cell("1"));
    expect(screen.getByText("1 ô đã đổi")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /^Đã đánh \(2\)/ }));

    expect(screen.getByText("1 ô đã đổi (1 ở cột đã ẩn)")).toBeTruthy();
  });

  it("tới giờ đánh khi trang đang mở thì cột đó tự ẩn", () => {
    render(<AttendanceGrid canManageOthers />);
    expect(screen.getByText("Trận c")).toBeTruthy();
    sessions = [...sessions, battleAt("d", "2026-08-28T20:00:00.000Z")];

    act(() => {
      vi.advanceTimersByTime(
        new Date("2026-08-27T20:00:01.000Z").getTime() - NOW.getTime()
      );
    });

    expect(screen.queryByText("Trận c")).toBeNull();
    expect(screen.getByText("Trận d")).toBeTruthy();
  });
});
