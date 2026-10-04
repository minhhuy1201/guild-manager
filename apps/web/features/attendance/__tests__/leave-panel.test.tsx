// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GuildClass } from "@guild/shared/enums";
import type { Character, Leave } from "@guild/shared/schemas";

const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));
const cancel = vi.fn();

const CHARACTERS: Character[] = [
  { id: "char-1", name: "Mèo Mập", guildClass: GuildClass.CUU_LINH },
  { id: "char-2", name: "Cún Con", guildClass: GuildClass.CUU_LINH },
];
const LEAVES: Leave[] = [
  {
    id: "l1",
    characterId: "char-1",
    startDate: "2026-10-05",
    endDate: "2026-10-12",
    reason: "du lịch",
    createdByCharacterId: "char-2",
    createdAt: "2026-10-04T05:00:00.000Z",
  },
  {
    id: "l2",
    characterId: "char-2",
    startDate: "2026-10-08",
    endDate: "2026-10-09",
    reason: null,
    createdByCharacterId: null,
    createdAt: "2026-10-04T06:00:00.000Z",
  },
];

vi.mock("../hooks/use-leaves", () => ({
  useLeaves: () => ({ data: LEAVES }),
  useCancelLeave: () => ({ mutateAsync: cancel }),
}));
vi.mock("../hooks/use-attendance", () => ({
  useCharacters: () => ({ data: CHARACTERS }),
}));
vi.mock("@/hooks/use-session-recovery", () => ({
  useSessionRecovery: () => () => false,
}));
vi.mock("@/features/auth", () => ({
  useSession: () => ({ data: { character: { id: "char-1" } } }),
}));
vi.mock("@/components/shared/toast", () => ({ toastSuccess, toastError }));
vi.mock("../components/leave-dialog", () => ({
  LeaveDialog: ({ open, isAdmin }: { open: boolean; isAdmin: boolean }) =>
    open ? <div data-testid="leave-dialog" data-admin={String(isAdmin)} /> : null,
}));

import { LeavePanel } from "../components/leave-panel";

beforeEach(() => {
  cancel.mockReset().mockResolvedValue({});
  toastSuccess.mockReset();
});
afterEach(cleanup);

describe("LeavePanel", () => {
  it("liệt kê tên thành viên, khoảng ngày và lý do", () => {
    render(<LeavePanel />);

    const row = screen.getByText("Mèo Mập").closest("tr") as HTMLElement;

    expect(within(row).getByText("05/10 - 12/10")).toBeTruthy();
    expect(within(row).getByText("du lịch")).toBeTruthy();
    expect(within(screen.getAllByRole("row")[2]).getByText("Cún Con")).toBeTruthy();
  });

  it("cột người khai: tên người khai, hoặc Admin khi không có nhân vật", () => {
    render(<LeavePanel />);

    const filedByOther = screen.getByText("Mèo Mập").closest("tr") as HTMLElement;
    const filedByRescue = screen.getAllByRole("row")[2];

    expect(within(filedByOther).getByText("Cún Con")).toBeTruthy();
    expect(within(filedByRescue).getByText("Admin")).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Người khai" })).toBeTruthy();
  });

  it("bấm Hủy chỉ mở hộp xác nhận nêu tên và khoảng ngày, chưa hủy", () => {
    render(<LeavePanel />);
    const row = screen.getAllByRole("row")[2];

    fireEvent.click(within(row).getByRole("button", { name: "Hủy" }));

    expect(screen.getByText("Hủy lần nghỉ của Cún Con?")).toBeTruthy();
    expect(screen.getByText(/Lần nghỉ 08\/10 - 09\/10 sẽ bị hủy/)).toBeTruthy();
    // Said plainly: an admin cancel also frees days that already closed.
    expect(screen.getByText(/đã khoá/)).toBeTruthy();
    expect(cancel).not.toHaveBeenCalled();
  });

  it("xác nhận thì hủy đúng lần nghỉ của dòng đó và báo thành công", async () => {
    render(<LeavePanel />);
    fireEvent.click(
      within(screen.getAllByRole("row")[2]).getByRole("button", { name: "Hủy" })
    );

    fireEvent.click(screen.getByRole("button", { name: /Hủy lần nghỉ/ }));

    await waitFor(() => expect(cancel).toHaveBeenCalledWith("l2"));
    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith("Đã hủy lần nghỉ.")
    );
    await waitFor(() =>
      expect(screen.queryByText("Hủy lần nghỉ của Cún Con?")).toBeNull()
    );
  });

  it("bỏ qua hộp xác nhận thì không hủy gì", () => {
    render(<LeavePanel />);
    fireEvent.click(
      within(screen.getAllByRole("row")[2]).getByRole("button", { name: "Hủy" })
    );

    fireEvent.click(screen.getByRole("button", { name: "Huỷ" }));

    expect(cancel).not.toHaveBeenCalled();
  });

  it("hiện nguyên câu lỗi của server và giữ hộp xác nhận", async () => {
    cancel.mockRejectedValue(new Error("Lần nghỉ không còn tồn tại."));
    render(<LeavePanel />);
    fireEvent.click(
      within(screen.getAllByRole("row")[2]).getByRole("button", { name: "Hủy" })
    );

    fireEvent.click(screen.getByRole("button", { name: /Hủy lần nghỉ/ }));

    expect(await screen.findByText("Lần nghỉ không còn tồn tại.")).toBeTruthy();
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("Khai hộ mở dialog ở chế độ admin", () => {
    render(<LeavePanel />);

    expect(screen.queryByTestId("leave-dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Khai hộ/ }));

    expect(screen.getByTestId("leave-dialog").dataset.admin).toBe("true");
  });
});
