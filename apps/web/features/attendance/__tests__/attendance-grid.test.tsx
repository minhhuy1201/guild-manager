// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GuildClass } from "@guild/shared/enums";
import type {
  AttendanceRecord,
  BattleSession,
  Character,
} from "@guild/shared/schemas";

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

import { AttendanceGrid } from "../components/attendance-grid";

afterEach(cleanup);

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
    isDeadlinePassed: false,
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
  boardState.isPending = false;
  sessions = [makeSession("a")];
  roster = [makeCharacter("1"), makeCharacter("2")];
  filtered = roster;
  records = {};
  mutateAsync.mockReset();
  mutateAsync.mockResolvedValue(undefined);
  useAttendanceFilterStore.setState({ unansweredOnly: false });
});

describe("AttendanceGrid — bố cục", () => {
  it("số cột header không đổi giữa lúc tải và lúc có 4 trận", () => {
    boardState.isPending = true;
    sessions = [];
    const { container, rerender } = render(<AttendanceGrid isAdmin />);
    const headerCount = () => container.querySelectorAll("thead th").length;

    const whilePending = headerCount();

    boardState.isPending = false;
    sessions = ["a", "b", "c", "d"].map(makeSession);
    rerender(<AttendanceGrid isAdmin />);

    expect(headerCount()).toBe(whilePending);
    expect(whilePending).toBe(5);
  });

  // Cột thao tác bên phải đã bỏ, trả chỗ cho các cột ngày.
  it("không còn cột Điểm danh, kể cả với admin", () => {
    render(<AttendanceGrid isAdmin />);

    expect(screen.queryByRole("columnheader", { name: "Điểm danh" })).toBeNull();
  });

  // Bộ lọc nằm trong card nó lọc, không đứng thành một khối riêng phía trên.
  it("thanh lọc nằm trong card của bảng", () => {
    render(<AttendanceGrid isAdmin={false} />);

    const card = screen
      .getByText("Điểm danh theo ngày đánh")
      .closest("[data-slot=card]") as HTMLElement;

    expect(card.querySelector("#attendance-search")).not.toBeNull();
    expect(card.querySelector("[aria-pressed]")?.textContent).toContain(
      "Chưa điểm danh"
    );
  });

  // Bang có vài chục người: 10 dòng một trang bắt admin lật trang liên tục.
  it("mở ra 50 dòng mỗi trang", () => {
    filtered = Array.from({ length: 60 }, (_, index) =>
      makeCharacter(String(index + 1))
    );

    const { container } = render(<AttendanceGrid isAdmin />);

    expect(container.querySelectorAll("tbody tr").length).toBe(50);
  });
});

describe("AttendanceGrid — hàng tổng", () => {
  it("mỗi ngày đếm Có, Không, Chưa trên toàn bang, không theo bộ lọc", () => {
    roster = [makeCharacter("1"), makeCharacter("2"), makeCharacter("3")];
    filtered = [roster[0]];
    records = { ...makeRecord("1", "a", true), ...makeRecord("2", "a", false) };

    render(<AttendanceGrid isAdmin={false} />);

    expect(
      screen.getByLabelText("Trận a: 1 Có, 1 Không, 1 chưa điểm danh")
    ).toBeTruthy();
  });
});

describe("AttendanceGrid — lọc Chưa điểm danh", () => {
  it("chỉ giữ người còn trận mở chưa trả lời", () => {
    records = makeRecord("1", "a", true);
    useAttendanceFilterStore.setState({ unansweredOnly: true });

    render(<AttendanceGrid isAdmin={false} />);

    expect(screen.queryByText("Người 1")).toBeNull();
    expect(screen.getByText("Người 2")).toBeTruthy();
  });
});

describe("AttendanceGrid — phân trang khi đang lọc", () => {
  // Lưu xong thì bản ghi được tải lại thành object mới, dù những người trong danh sách lọc không đổi.
  it("tải lại bản ghi mà danh sách lọc vẫn là những người cũ thì không nhảy về trang 1", () => {
    filtered = Array.from({ length: 60 }, (_, index) =>
      makeCharacter(String(index + 1))
    );
    roster = filtered;
    useAttendanceFilterStore.setState({ unansweredOnly: true });
    const { rerender } = render(<AttendanceGrid isAdmin={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Trang sau" }));
    expect(screen.getByText("Người 51")).toBeTruthy();

    records = { ...records };
    rerender(<AttendanceGrid isAdmin={false} />);

    expect(screen.getByText("Người 51")).toBeTruthy();
  });
});

describe("AttendanceGrid — admin bấm thẳng vào ô", () => {
  it("bấm xoay vòng Có, Không, rồi lại Có", () => {
    render(<AttendanceGrid isAdmin />);

    fireEvent.click(cell("1"));
    expect(cell("1").getAttribute("aria-label")).toContain(": Có");
    fireEvent.click(cell("1"));
    expect(cell("1").getAttribute("aria-label")).toContain(": Không");
    fireEvent.click(cell("1"));
    expect(cell("1").getAttribute("aria-label")).toContain(": Có");
  });

  it("thanh dưới đếm số ô đã đổi, Huỷ bỏ hết", () => {
    render(<AttendanceGrid isAdmin />);

    fireEvent.click(cell("1"));
    fireEvent.click(cell("2"));
    expect(screen.getByText("2 ô đã đổi")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Huỷ/ }));

    expect(screen.queryByText("2 ô đã đổi")).toBeNull();
    expect(cell("1").dataset.changed).toBe("false");
  });

  it("Lưu gửi mọi ô đã đổi một lần, xong thì hết nháp", async () => {
    render(<AttendanceGrid isAdmin />);
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
  });

  it("lưu lỗi một phần thì giữ lại đúng ô lỗi và báo lỗi", async () => {
    mutateAsync
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new ApiError("Máy chủ bận.", 500));
    render(<AttendanceGrid isAdmin />);
    fireEvent.click(cell("1"));
    fireEvent.click(cell("2"));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^Lưu$/ }));
    });

    expect(screen.getByText("Máy chủ bận.")).toBeTruthy();
    expect(cell("1").dataset.changed).toBe("false");
    expect(cell("2").dataset.changed).toBe("true");
  });

  it("còn nháp thì rời trang phải được hỏi lại", () => {
    render(<AttendanceGrid isAdmin />);
    fireEvent.click(cell("1"));

    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("member không bấm được ô nào", () => {
    render(<AttendanceGrid isAdmin={false} />);

    expect(screen.queryAllByRole("button", { name: /Trận a/ })).toHaveLength(0);
  });
});
