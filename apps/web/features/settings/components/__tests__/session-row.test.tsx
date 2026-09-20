// @vitest-environment jsdom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BattleSession } from "@guild/shared/schemas";

import { SessionRow } from "../session-row";

// `vi.hoisted` because the mock factories below are hoisted above these bindings.
const { reopenAttendance, toastSuccess, toastError } = vi.hoisted(() => ({
  reopenAttendance: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

// The write protocol recovers an expired session by navigating, which needs a router; this suite
// renders outside one.
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

// The request module is a "use server" file reaching into httpOnly cookies; jsdom cannot load it.
vi.mock("../../api/battle-sessions-api", () => ({
  createBattleSession: vi.fn(),
  updateBattleSession: vi.fn(),
  deleteBattleSession: vi.fn(),
  reopenAttendance,
}));

// Only the subtitle is needed from the attendance feature, and its barrel drags in server-only code.
vi.mock("@/features/attendance", () => ({ getSessionSubtitle: () => null }));

vi.mock("@/components/shared/toast", () => ({ toastSuccess, toastError }));

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

// React only batches and flushes state updates inside act() when it knows it is under test.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

/**
 * A battle day as the API returns it.
 * @param overrides - Fields to change from an open, editable scrim
 * @returns The session fixture
 */
function session(overrides: Partial<BattleSession> = {}): BattleSession {
  return {
    id: "session-tue",
    label: "Thứ 3 · 20:30",
    dateTime: "2026-09-01T13:30:00.000Z",
    deadline: "2026-09-01T03:00:00.000Z",
    isAttendanceClosed: false,
    canReopenAttendance: false,
    isGuildWar: false,
    opponent: null,
    weekStart: "2026-08-30T17:00:00.000Z",
    attendanceCount: 0,
    matchCount: 2,
    formationMatchCount: 0,
    ...overrides,
  };
}

/**
 * Render one row inside a fresh QueryClient — the reopen action's mutation needs one.
 * @param value - The session to draw
 * @returns The testing-library render result
 */
function renderRow(value: BattleSession) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <SessionRow session={value} onEdit={vi.fn()} onDelete={vi.fn()} />,
    {
      /**
       * Provide the QueryClient the reopen mutation reads from.
       * @param props - Children rendered inside the provider
       * @returns The wrapped tree
       */
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    }
  );
}

describe("SessionRow", () => {
  it("ngày chưa gửi đội hình thì không có nút mở lại", () => {
    renderRow(session());

    expect(screen.queryByText("Mở lại điểm danh")).toBeNull();
  });

  it("ngày đã chốt đội hình thì có badge và nút mở lại", () => {
    renderRow(session({ isAttendanceClosed: true, canReopenAttendance: true }));

    expect(screen.getByText("Đã chốt đội hình")).toBeTruthy();
    expect(screen.getAllByText("Mở lại điểm danh").length).toBeGreaterThan(0);
  });

  // Bang Chiến can be neither edited nor deleted, yet it is the day whose line-up is announced most
  // often.
  it("Bang Chiến vẫn mở lại điểm danh được dù không sửa/xoá được", () => {
    renderRow(
      session({
        isGuildWar: true,
        isAttendanceClosed: true,
        canReopenAttendance: true,
      })
    );

    expect(screen.queryByText("Sửa")).toBeNull();
    expect(screen.queryByText("Xoá")).toBeNull();
    expect(screen.getAllByText("Mở lại điểm danh").length).toBeGreaterThan(0);
  });

  // The guild has just read the line-up; reopening lets the answers behind it change, so ask
  // again.
  it("bấm nút thì hỏi lại chứ chưa gọi API", async () => {
    renderRow(session({ isAttendanceClosed: true, canReopenAttendance: true }));

    fireEvent.click(screen.getAllByText("Mở lại điểm danh")[0]);

    await waitFor(() =>
      expect(screen.getByText(/đã gửi lên Discord/)).toBeTruthy()
    );
    expect(reopenAttendance).not.toHaveBeenCalled();
  });

  it("xác nhận thì gọi API và báo thành công", async () => {
    reopenAttendance.mockResolvedValue(session());
    renderRow(session({ isAttendanceClosed: true, canReopenAttendance: true }));

    fireEvent.click(screen.getAllByText("Mở lại điểm danh")[0]);
    fireEvent.click(await screen.findByText("Mở lại"));

    await waitFor(() =>
      expect(reopenAttendance).toHaveBeenCalledWith("session-tue")
    );
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
  });

  it("API từ chối thì giữ nguyên câu tiếng Việt của backend", async () => {
    reopenAttendance.mockRejectedValue(new Error("Hạn điểm danh đã qua."));
    renderRow(session({ isAttendanceClosed: true, canReopenAttendance: true }));

    fireEvent.click(screen.getAllByText("Mở lại điểm danh")[0]);
    fireEvent.click(await screen.findByText("Mở lại"));

    await waitFor(() =>
      expect(screen.getByText("Hạn điểm danh đã qua.")).toBeTruthy()
    );
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});
