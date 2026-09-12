// @vitest-environment jsdom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { BattleSession } from "@guild/shared/schemas";

import { SessionFormDialog } from "../session-form-dialog";

// The write protocol recovers an expired session by navigating, which needs a router; these suites
// render outside one.
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));


// The request module is a "use server" file reaching into httpOnly cookies; jsdom cannot load it,
// and this test is about the form's fields, not about the write.
vi.mock("../../api/battle-sessions-api", () => ({
  createBattleSession: vi.fn(),
  updateBattleSession: vi.fn(),
  deleteBattleSession: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// React only batches and flushes state updates inside act() when it knows it is under test.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const GUILD_WAR: BattleSession = {
  id: "gw-2026-08-31",
  label: "Thứ 7 · Bang Chiến",
  dateTime: "2026-09-05T13:00:00.000Z",
  deadline: "2026-09-03T10:00:00.000Z",
  isDeadlinePassed: false,
  isGuildWar: true,
  opponent: null,
  weekStart: "2026-08-30T17:00:00.000Z",
  attendanceCount: 0,
  matchCount: 2,
  formationMatchCount: 0,
};

/**
 * Render the dialog inside a fresh QueryClient — the form's mutations need one.
 * @param session - Session being edited, null while creating
 * @returns The testing-library render result
 */
function renderDialog(session: BattleSession | null) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  /**
   * Provide the QueryClient the form's mutation hooks read from.
   * @param children - The dialog under test
   * @returns The wrapped tree
   */
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return render(
    <SessionFormDialog open session={session} onOpenChange={() => {}} />,
    { wrapper }
  );
}

describe("SessionFormDialog", () => {
  it("form tạo mới mặc định 2 trận", () => {
    renderDialog(null);

    expect(screen.getByLabelText("Số trận").textContent).toContain("2 trận");
  });

  it("Bang Chiến chỉ hiện dòng chữ, không có ô chọn", () => {
    renderDialog(GUILD_WAR);

    expect(screen.queryByLabelText("Số trận")).toBeNull();
    expect(
      screen.getByText(/hệ thống tự tính theo tuần, không sửa được/)
    ).toBeTruthy();
  });

  it("Bang Chiến ghi hạn chót 12:00 Thứ 6", () => {
    renderDialog(GUILD_WAR);

    expect(
      screen.getByText("12:00 Thứ 6 - cố định, không sửa được.")
    ).toBeTruthy();
  });

  it("chọn ngày đánh thì hạn chót tự điền 12:00 hôm trước", () => {
    // Only Date is faked: the calendar opens on the current month, and the popover still needs real
    // timers to settle.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-01T09:00:00+07:00"));
    renderDialog(null);

    // The dialog renders through a portal, so its fields live under `document`, not the container.
    fireEvent.click(document.querySelector("#session-date-time")!);
    // `CalendarDayButton` stamps every day with its `vi` locale date.
    const thursday = new Date(2026, 8, 10).toLocaleDateString("vi");
    fireEvent.click(document.querySelector(`[data-day="${thursday}"]`)!);

    expect(
      document.querySelector("#session-deadline")?.textContent
    ).toContain("09/09/2026");
    expect(
      (screen.getByLabelText("Hạn chót điểm danh — giờ") as HTMLInputElement)
        .value
    ).toBe("12:00");
  });
});
