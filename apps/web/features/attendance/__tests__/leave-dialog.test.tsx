// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GuildClass } from "@guild/shared/enums";
import type { Character } from "@guild/shared/schemas";

const { toastSuccess, calendarProps } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  calendarProps: { current: undefined as Record<string, unknown> | undefined },
}));
const mutateAsync = vi.fn();

vi.mock("../hooks/use-leaves", () => ({
  useCreateLeave: () => ({ mutateAsync }),
}));
vi.mock("@/hooks/use-session-recovery", () => ({
  useSessionRecovery: () => () => false,
}));
vi.mock("@/components/shared/toast", () => ({
  toastSuccess,
  toastError: vi.fn(),
}));
// The real calendar renders a month of buttons; what is under test is what the dialog hands it and
// what it does with a picked range.
vi.mock("@/components/ui/calendar", () => ({
  Calendar: (props: {
    onSelect: (range: { from: Date; to?: Date }) => void;
  }) => {
    calendarProps.current = props as unknown as Record<string, unknown>;

    return (
      <button
        type="button"
        onClick={() =>
          props.onSelect({ from: new Date(2026, 9, 5), to: new Date(2026, 9, 12) })
        }
      >
        chọn khoảng
      </button>
    );
  },
}));

import { LeaveDialog } from "../components/leave-dialog";

const CHARACTERS: Character[] = [
  { id: "char-1", name: "Mèo Mập", guildClass: GuildClass.CUU_LINH },
  { id: "char-2", name: "Cún Con", guildClass: GuildClass.CUU_LINH },
];

/** Render the open dialog as a member or an admin. */
function renderDialog(isAdmin: boolean, ownCharacterId: string | null = "char-1") {
  return render(
    <LeaveDialog
      open
      onOpenChange={vi.fn()}
      isAdmin={isAdmin}
      ownCharacterId={ownCharacterId}
      characters={CHARACTERS}
    />
  );
}

beforeEach(() => {
  mutateAsync.mockReset().mockResolvedValue({});
  toastSuccess.mockReset();
});
afterEach(cleanup);

describe("LeaveDialog", () => {
  it("không gửi khi chưa chọn khoảng ngày", async () => {
    renderDialog(false);

    fireEvent.click(screen.getByRole("button", { name: /Khai nghỉ/ }));

    expect(await screen.findByText("Vui lòng chọn khoảng ngày nghỉ.")).toBeTruthy();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("member không thấy ô chọn thành viên; gửi cho nhân vật của mình", async () => {
    renderDialog(false);

    expect(screen.queryByLabelText("Thành viên")).toBeNull();

    fireEvent.click(screen.getByText("chọn khoảng"));
    fireEvent.change(screen.getByLabelText("Lý do"), {
      target: { value: " du lịch " },
    });
    fireEvent.click(screen.getByRole("button", { name: /Khai nghỉ/ }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        characterId: "char-1",
        startDate: "2026-10-05",
        endDate: "2026-10-12",
        reason: "du lịch",
      })
    );
    expect(toastSuccess).toHaveBeenCalledWith("Đã khai nghỉ 05/10 - 12/10.");
  });

  it("admin thấy ô chọn thành viên và phải chọn trước khi gửi", async () => {
    renderDialog(true, null);

    expect(screen.getByLabelText("Thành viên")).toBeTruthy();

    fireEvent.click(screen.getByText("chọn khoảng"));
    fireEvent.click(screen.getByRole("button", { name: /Khai nghỉ/ }));
    expect(await screen.findByText("Vui lòng chọn thành viên.")).toBeTruthy();
    expect(mutateAsync).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Thành viên"), {
      target: { value: "char-2" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Khai nghỉ/ }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ characterId: "char-2" })
      )
    );
  });

  it("chỉ khoá ngày đã qua với member, admin chọn được mọi ngày", () => {
    renderDialog(false);
    expect(calendarProps.current?.disabled).toMatchObject({
      before: expect.any(Date),
    });
    cleanup();

    renderDialog(true);
    expect(calendarProps.current?.disabled).toBeUndefined();
  });

  it("hiện nguyên câu lỗi của server và giữ form", async () => {
    mutateAsync.mockRejectedValue(new Error("Khoảng nghỉ trùng với lần nghỉ 12/10 - 15/10."));
    renderDialog(false);

    fireEvent.click(screen.getByText("chọn khoảng"));
    fireEvent.click(screen.getByRole("button", { name: /Khai nghỉ/ }));

    expect(
      await screen.findByText("Khoảng nghỉ trùng với lần nghỉ 12/10 - 15/10.")
    ).toBeTruthy();
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});
