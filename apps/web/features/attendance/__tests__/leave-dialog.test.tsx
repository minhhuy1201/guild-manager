// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GuildClass } from "@guild/shared/enums";
import { vnDateKey } from "@guild/shared/lib";
import type { Character } from "@guild/shared/schemas";

const { toastSuccess } = vi.hoisted(() => ({ toastSuccess: vi.fn() }));
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

/** The day each stubbed field reports when its button is pressed; set per test. */
const picks: Record<string, string> = {};

// The real field is a popover over a calendar; what the dialog owns is how the two days relate, so
// the stub shows what it was given and reports a chosen day.
vi.mock("../components/leave-day-field", () => ({
  LeaveDayField: (props: {
    label: string;
    value: string;
    minDay?: string;
    onChange: (day: string) => void;
  }) => (
    <div
      data-testid={props.label}
      data-value={props.value}
      data-min={props.minDay ?? ""}
    >
      <button type="button" onClick={() => props.onChange(picks[props.label])}>
        chọn {props.label}
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

/** Press a field's stub button so it reports the day `picks` holds for it. */
function pick(label: string, day: string) {
  picks[label] = day;
  fireEvent.click(screen.getByText(`chọn ${label}`));
}

const valueOf = (label: string) => screen.getByTestId(label).dataset.value;
const minOf = (label: string) => screen.getByTestId(label).dataset.min;
const submit = () => fireEvent.click(screen.getByRole("button", { name: /Khai nghỉ/ }));

beforeEach(() => {
  mutateAsync.mockReset().mockResolvedValue({});
  toastSuccess.mockReset();
});
afterEach(cleanup);

describe("LeaveDialog", () => {
  it("không gửi khi chưa chọn ngày bắt đầu", async () => {
    renderDialog(false);

    submit();

    expect(await screen.findByText("Vui lòng chọn ngày bắt đầu nghỉ.")).toBeTruthy();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("chọn ngày bắt đầu thì ngày kết thúc theo luôn, nghỉ một ngày là xong", async () => {
    renderDialog(false);

    pick("Từ ngày", "2026-10-05");
    expect(valueOf("Đến ngày")).toBe("2026-10-05");
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

  it("đổi ngày bắt đầu sang sau ngày kết thúc thì kéo ngày kết thúc theo", () => {
    renderDialog(false);
    pick("Từ ngày", "2026-10-05");
    pick("Đến ngày", "2026-10-12");

    pick("Từ ngày", "2026-10-20");

    expect(valueOf("Đến ngày")).toBe("2026-10-20");
  });

  it("đổi ngày bắt đầu sang trước ngày kết thúc thì giữ ngày kết thúc", () => {
    renderDialog(false);
    pick("Từ ngày", "2026-10-05");
    pick("Đến ngày", "2026-10-12");

    pick("Từ ngày", "2026-10-07");

    expect(valueOf("Đến ngày")).toBe("2026-10-12");
  });

  it("ô Đến ngày không cho chọn trước ngày bắt đầu", () => {
    renderDialog(false);
    pick("Từ ngày", "2026-10-05");

    expect(minOf("Đến ngày")).toBe("2026-10-05");
  });

  it("member không được chọn ngày đã qua; admin thì được", () => {
    renderDialog(false);
    expect(minOf("Từ ngày")).toBe(TODAY);
    // With no start yet, the end is bounded by today as well.
    expect(minOf("Đến ngày")).toBe(TODAY);
    cleanup();

    renderDialog(true, null);
    expect(minOf("Từ ngày")).toBe("");
    expect(minOf("Đến ngày")).toBe("");
  });

  it("member không thấy ô chọn thành viên; gửi cho nhân vật của mình kèm lý do", async () => {
    renderDialog(false);
    expect(screen.queryByTestId("member-picker")).toBeNull();

    pick("Từ ngày", "2026-10-05");
    pick("Đến ngày", "2026-10-12");
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
    pick("Từ ngày", "2026-10-05");

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
    pick("Từ ngày", "2026-10-05");

    submit();

    expect(
      await screen.findByText("Khoảng nghỉ trùng với lần nghỉ 12/10 - 15/10.")
    ).toBeTruthy();
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});
