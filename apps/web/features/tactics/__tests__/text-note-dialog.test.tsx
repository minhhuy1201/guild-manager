// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TACTIC_LIMITS } from "@guild/shared/schemas";

import { TextNoteDialog } from "../components/text-note-dialog";

afterEach(cleanup);

describe("TextNoteDialog", () => {
  it("hands over the text that was typed", () => {
    const onConfirm = vi.fn();
    render(<TextNoteDialog open onConfirm={onConfirm} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Nội dung ghi chú"), {
      target: { value: "Tập kết" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Thêm" }));

    expect(onConfirm).toHaveBeenCalledWith("Tập kết");
  });

  it("keeps the confirm button off while the field is empty", () => {
    render(<TextNoteDialog open onConfirm={vi.fn()} onCancel={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: "Thêm" }).hasAttribute("disabled")
    ).toBe(true);
  });

  it("stops the note at the contract's length", () => {
    render(<TextNoteDialog open onConfirm={vi.fn()} onCancel={vi.fn()} />);

    expect(
      screen.getByLabelText("Nội dung ghi chú").getAttribute("maxlength")
    ).toBe(String(TACTIC_LIMITS.textLength));
  });

  it("drops the note on cancel", () => {
    const onCancel = vi.fn();
    render(<TextNoteDialog open onConfirm={vi.fn()} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole("button", { name: "Huỷ" }));

    expect(onCancel).toHaveBeenCalled();
  });
});
