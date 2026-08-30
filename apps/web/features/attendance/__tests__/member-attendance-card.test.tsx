// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GuildClass } from "@guild/shared/enums";
import type {
  AttendanceRecord,
  AttendanceSummary,
  BattleSession,
  Character,
} from "@guild/shared/schemas";

import { ApiError } from "@/lib/api-client";
import { recordKey } from "../lib/record-key";

const CHARACTER: Character = {
  id: "char-1",
  name: "Mèo Mập",
  guildClass: GuildClass.CUU_LINH,
};

const boardState = {
  isPending: false,
  isError: false,
  errorMessage: "",
  refetch: vi.fn(),
};

let character: Character | null = CHARACTER;
let sessions: BattleSession[] = [];
let records: Record<string, AttendanceRecord> = {};
let summary: AttendanceSummary[] = [];
const markState = {
  mutateAsync: vi.fn(),
  isPending: false,
  variables: undefined as
    | { characterId: string; sessionId: string; isPresent: boolean }
    | undefined,
};

// `vi.mock` factories are hoisted above the file's own consts, so the spies have to be created in
// a hoisted block for the toast factory to close over them.
const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("../hooks/use-attendance-board", () => ({
  useAttendanceBoard: () => boardState,
}));
vi.mock("../hooks/use-deadline-refresh", () => ({
  useDeadlineRefresh: () => {},
}));
vi.mock("../hooks/use-attendance", () => ({
  useBattleSessions: () => ({ data: sessions }),
  useAttendanceRecords: () => ({ data: records }),
  useAttendanceSummary: () => ({ data: summary }),
  useMarkAttendance: () => markState,
}));
vi.mock("@/features/auth", () => ({
  useSession: () => ({ data: { character } }),
}));
vi.mock("@/components/shared/toast", () => ({ toastSuccess, toastError }));

import { MemberAttendanceCard } from "../components/member-attendance-card";

/**
 * Build a battle session with only the fields the card reads.
 * @param id - Session id, also used to build its label
 * @param overrides - Fields this test needs to differ
 * @returns A battle session shaped for the card
 */
function makeSession(
  id: string,
  overrides: Partial<BattleSession> = {}
): BattleSession {
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
    ...overrides,
  };
}

/**
 * Record one answer for the character on a session.
 * @param sessionId - Session the answer belongs to
 * @param isPresent - The recorded answer
 * @returns The record map keyed the way the app keys it
 */
function makeRecords(
  sessionId: string,
  isPresent: boolean,
  reason: string | null = null
): Record<string, AttendanceRecord> {
  return {
    [recordKey(CHARACTER.id, sessionId)]: {
      characterId: CHARACTER.id,
      sessionId,
      isPresent,
      markedAt: "2026-08-24T10:00:00.000Z",
      reason,
    },
  };
}

/**
 * The tile holding a session, found through the heading that names it.
 * @param sessionId - Session whose tile is wanted
 * @returns The tile element
 */
function tileOf(sessionId: string): HTMLElement {
  const label = screen.getByText(`Trận ${sessionId}`);

  return label.closest("div.rounded-lg.border") as HTMLElement;
}

/**
 * The answer button of a tile.
 * @param sessionId - Session whose tile holds the button
 * @param answer - Visible text of the button
 * @returns The button element
 */
function answerButton(sessionId: string, answer: "Có" | "Không"): HTMLElement {
  const buttons = [...tileOf(sessionId).querySelectorAll("button")];

  return buttons.find((button) => button.textContent === answer) as HTMLElement;
}

afterEach(cleanup);

describe("MemberAttendanceCard", () => {
  beforeEach(() => {
    character = CHARACTER;
    sessions = [makeSession("sess-1")];
    records = {};
    summary = [];
    boardState.isPending = false;
    boardState.isError = false;
    markState.mutateAsync = vi.fn().mockResolvedValue(undefined);
    markState.isPending = false;
    markState.variables = undefined;
    toastSuccess.mockClear();
    toastError.mockClear();
  });

  it("tài khoản chưa gắn nhân vật thì chỉ thấy lời nhắn, không thấy ô ngày nào", () => {
    character = null;

    render(<MemberAttendanceCard />);

    expect(
      screen.getByText(
        "Tài khoản chưa được gán nhân vật, liên hệ quản trị viên."
      )
    ).toBeTruthy();
    expect(screen.queryByText("Trận sess-1")).toBeNull();
  });

  it("tuần chưa có trận nào thì báo rỗng dưới tên nhân vật", () => {
    sessions = [];

    render(<MemberAttendanceCard />);

    expect(screen.getByText("Điểm danh của Mèo Mập")).toBeTruthy();
    expect(screen.getByText("Tuần này chưa có trận nào.")).toBeTruthy();
  });

  it("ngày chưa trả lời viền vàng hổ phách — chưa phải thành công cũng chưa phải từ chối", () => {
    render(<MemberAttendanceCard />);

    expect(tileOf("sess-1").className).toContain("border-amber-500");
    expect(tileOf("sess-1").className).toContain("bg-amber-500/5");
  });

  it('ngày đã trả lời "Có" chuyển sang tông emerald', () => {
    records = makeRecords("sess-1", true);

    render(<MemberAttendanceCard />);

    expect(tileOf("sess-1").className).toContain("border-emerald-500");
    expect(tileOf("sess-1").className).not.toContain("amber");
  });

  it('ngày đã trả lời "Không" là một câu trả lời thật, không còn là ngày chờ', () => {
    records = makeRecords("sess-1", false);

    render(<MemberAttendanceCard />);

    expect(tileOf("sess-1").className).toContain("border-destructive");
    expect(tileOf("sess-1").className).not.toContain("amber");
  });

  it("câu trả lời đang giữ được đánh dấu aria-pressed", () => {
    records = makeRecords("sess-1", true);

    render(<MemberAttendanceCard />);

    expect(answerButton("sess-1", "Có").getAttribute("aria-pressed")).toBe(
      "true"
    );
    expect(answerButton("sess-1", "Không").getAttribute("aria-pressed")).toBe(
      "false"
    );
  });

  it("quá hạn thì ô ngày chỉ còn chữ Đã khoá, không còn nút nào", () => {
    sessions = [makeSession("sess-1", { isDeadlinePassed: true })];

    render(<MemberAttendanceCard />);

    expect(screen.getByText("Đã khoá")).toBeTruthy();
    expect(tileOf("sess-1").querySelectorAll("button")).toHaveLength(0);
  });

  it("phụ đề ngày kèm số người đã nhận trận đó", () => {
    summary = [{ sessionId: "sess-1", coCount: 7, khongCount: 2 }];

    render(<MemberAttendanceCard />);

    expect(tileOf("sess-1").textContent).toContain("Đã có 7 người");
  });

  it("bấm Có ghi đúng nhân vật, đúng trận, đúng câu trả lời", async () => {
    render(<MemberAttendanceCard />);

    await act(async () => {
      fireEvent.click(answerButton("sess-1", "Có"));
    });

    expect(markState.mutateAsync).toHaveBeenCalledWith({
      characterId: "char-1",
      sessionId: "sess-1",
      isPresent: true,
    });
  });

  it("ghi xong thì báo thành công bằng toast, kèm câu trả lời và tên trận", async () => {
    render(<MemberAttendanceCard />);

    await act(async () => {
      fireEvent.click(answerButton("sess-1", "Không"));
    });

    expect(toastSuccess).toHaveBeenCalledWith(
      'Đã điểm danh "Không" cho Trận sess-1.'
    );
    expect(toastError).not.toHaveBeenCalled();
  });

  it("API trả lỗi thì toast nói đúng câu của API", async () => {
    markState.mutateAsync = vi
      .fn()
      .mockRejectedValue(new ApiError("Đã quá hạn điểm danh.", 400));

    render(<MemberAttendanceCard />);

    await act(async () => {
      fireEvent.click(answerButton("sess-1", "Có"));
    });

    expect(toastError).toHaveBeenCalledWith("Đã quá hạn điểm danh.");
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("lỗi không phải từ API thì toast dùng câu dự phòng, không lộ lỗi kỹ thuật", async () => {
    markState.mutateAsync = vi.fn().mockRejectedValue(new TypeError("fetch failed"));

    render(<MemberAttendanceCard />);

    await act(async () => {
      fireEvent.click(answerButton("sess-1", "Có"));
    });

    expect(toastError).toHaveBeenCalledWith(
      "Không điểm danh được, thử lại giúp mình."
    );
  });

  it("đang ghi thì spinner chỉ nằm trên đúng nút vừa bấm", () => {
    sessions = [makeSession("sess-1"), makeSession("sess-2")];
    markState.isPending = true;
    markState.variables = {
      characterId: CHARACTER.id,
      sessionId: "sess-1",
      isPresent: true,
    };

    render(<MemberAttendanceCard />);

    expect(
      answerButton("sess-1", "Có").querySelector(".animate-spin")
    ).not.toBeNull();
    expect(
      answerButton("sess-1", "Không").querySelector(".animate-spin")
    ).toBeNull();
    expect(
      answerButton("sess-2", "Có").querySelector(".animate-spin")
    ).toBeNull();
  });

  it("đang ghi thì mọi nút của mọi ngày đều khoá, tránh spinner nhảy sang nút khác", () => {
    sessions = [makeSession("sess-1"), makeSession("sess-2")];
    markState.isPending = true;
    markState.variables = {
      characterId: CHARACTER.id,
      sessionId: "sess-1",
      isPresent: true,
    };

    render(<MemberAttendanceCard />);

    for (const sessionId of ["sess-1", "sess-2"]) {
      for (const answer of ["Có", "Không"] as const) {
        expect(answerButton(sessionId, answer)).toHaveProperty(
          "disabled",
          true
        );
      }
    }
  });

  it("đang tải thì chỉ có khung xương, chưa có ngày nào", () => {
    boardState.isPending = true;

    render(<MemberAttendanceCard />);

    expect(screen.queryByText("Trận sess-1")).toBeNull();
  });
});
