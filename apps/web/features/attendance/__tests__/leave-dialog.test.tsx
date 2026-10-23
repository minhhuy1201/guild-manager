// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GuildClass } from "@guild/shared/enums";
import { vnDateKey } from "@guild/shared/lib";
import type { Character } from "@guild/shared/schemas";

const { toastSuccess } = vi.hoisted(() => ({ toastSuccess: vi.fn() }));
const mutateAsync = vi.fn();

/** The range the stubbed field reports when pressed; set per test. */
const picks = { start: "", end: "" };

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

// The real field is a popover over a calendar; what the dialog owns is what it hands the field and
// what it files, so the stub shows what it was given and reports a chosen range.
vi.mock("../components/leave-range-field", () => ({
  LeaveRangeField: (props: {
    start: string;
    end: string;
    minDay: string;
    onChange: (start: string, end: string) => void;
  }) => (
    <div
      data-testid="range"
      data-start={props.start}
      data-end={props.end}
      data-min={props.minDay}
    >
      <button type="button" onClick={() => props.onChange(picks.start, picks.end)}>
        chọn khoảng
      </button>
    </div>
  ),
}));
vi.mock("../components/member-picker", () => ({
  MemberPicker: (props: { value: string; onChange: (id: string) => void }) => (
    <div data-testid="member-picker" data-value={props.value}>
      <button type="button" onClick={() => props.onChange("char-2")}>
        chọn Cún Con
      </button>
    </div>
  ),
}));

import { LeaveDialog } from "../components/leave-dialog";

const CHARACTERS: Character[] = [
  { id: "char-1", name: "Mèo Mập", guildClass: GuildClass.CUU_LINH },
  { id: "char-2", name: "Cún Con", guildClass: GuildClass.CUU_LINH },
];
const TODAY = vnDateKey(new Date());

/** Render the open dialog as a member or an admin. */
function renderDialog(canManageOthers: boolean, ownCharacterId: string | null = "char-1") {
  return render(
    <LeaveDialog
      open
      onOpenChange={vi.fn()}
      canManageOthers={canManageOthers}
      ownCharacterId={ownCharacterId}
      characters={CHARACTERS}
    />
  );
}

/** Press the field's stub button so it reports the range. */
function pickRange(start: string, end = start) {
  picks.start = start;
  picks.end = end;
  fireEvent.click(screen.getByText("chọn khoảng"));
}

const range = () => screen.getByTestId("range").dataset;
const submit = () => fireEvent.click(screen.getByRole("button", { name: /Khai nghỉ/ }));

beforeEach(() => {
  mutateAsync.mockReset().mockResolvedValue({});
  toastSuccess.mockReset();
});
afterEach(cleanup);

describe("LeaveDialog", () => {
  it("không gửi khi chưa chọn ngày", async () => {
    renderDialog(false);

    submit();

    expect(await screen.findByText("Vui lòng chọn ngày nghỉ.")).toBeTruthy();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("nghỉ một ngày: khoảng một ngày được gửi đi", async () => {
    renderDialog(false);

    pickRange("2026-10-05");
    submit();

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        characterId: "char-1",
        startDate: "2026-10-05",
        endDate: "2026-10-05",
        reason: null,
      })
    );
    expect(toastSuccess).toHaveBeenCalledWith("Đã khai nghỉ 05/10 - 05/10.");
  });

  it("khoảng chọn được truyền xuống trường ngày", () => {
    renderDialog(false);

    pickRange("2026-10-05", "2026-10-12");

    expect(range().start).toBe("2026-10-05");
    expect(range().end).toBe("2026-10-12");
  });

  it("không ai được chọn ngày đã qua, admin cũng vậy", () => {
    renderDialog(false);
    expect(range().min).toBe(TODAY);
    cleanup();

    renderDialog(true, null);
    expect(range().min).toBe(TODAY);
  });

  it("member không thấy ô chọn thành viên; gửi cho nhân vật của mình kèm lý do", async () => {
    renderDialog(false);
    expect(screen.queryByTestId("member-picker")).toBeNull();

    pickRange("2026-10-05", "2026-10-12");
    fireEvent.change(screen.getByLabelText("Lý do"), {
      target: { value: " du lịch " },
    });
    submit();

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        characterId: "char-1",
        startDate: "2026-10-05",
        endDate: "2026-10-12",
        reason: "du lịch",
      })
    );
  });

  it("admin phải chọn thành viên trước khi gửi", async () => {
    renderDialog(true, null);
    pickRange("2026-10-05");

    submit();
    expect(await screen.findByText("Vui lòng chọn thành viên.")).toBeTruthy();
    expect(mutateAsync).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("chọn Cún Con"));
    submit();

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ characterId: "char-2" })
      )
    );
  });

  it("ô lý do là textarea nhiều dòng", () => {
    renderDialog(false);

    expect(screen.getByLabelText("Lý do").tagName).toBe("TEXTAREA");
  });

  it("hiện nguyên câu lỗi của server và giữ form", async () => {
    mutateAsync.mockRejectedValue(
      new Error("Khoảng nghỉ trùng với lần nghỉ 12/10 - 15/10.")
    );
    renderDialog(false);
    pickRange("2026-10-05");

    submit();

    expect(
      await screen.findByText("Khoảng nghỉ trùng với lần nghỉ 12/10 - 15/10.")
    ).toBeTruthy();
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});
