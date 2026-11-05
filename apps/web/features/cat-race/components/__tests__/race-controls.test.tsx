// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RaceControls } from "../race-controls";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Render the controls with sensible defaults.
 * @param props - Overrides
 * @returns The two edit spies
 */
function renderControls(props: Partial<React.ComponentProps<typeof RaceControls>> = {}) {
  const onEditEntrants = vi.fn();
  const onEditParticipants = vi.fn();
  const onCommentaryChange = vi.fn();
  render(
    <RaceControls
      durationText="20"
      onDurationTextChange={() => {}}
      isDurationValid
      isCommentaryOn
      onCommentaryChange={onCommentaryChange}
      isLocked={false}
      hasPrize
      entrantCount={2}
      participantCount={5}
      onEditEntrants={onEditEntrants}
      onEditParticipants={onEditParticipants}
      {...props}
    />
  );

  return { onEditEntrants, onEditParticipants, onCommentaryChange };
}

afterEach(cleanup);

describe("RaceControls", () => {
  it("opens the edit dialogs", () => {
    const { onEditEntrants, onEditParticipants } = renderControls();

    fireEvent.click(screen.getByRole("button", { name: "Danh sách đua 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Người tham gia 5" }));

    expect(onEditEntrants).toHaveBeenCalled();
    expect(onEditParticipants).toHaveBeenCalled();
  });

  it("disables the entrants button without a prize", () => {
    renderControls({ hasPrize: false });

    expect((screen.getByRole("button", { name: /Danh sách đua/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows the typed duration and reports changes", () => {
    const onDurationTextChange = vi.fn();
    renderControls({ onDurationTextChange });
    const field = screen.getByLabelText("Thời gian đua (giây)") as HTMLInputElement;
    expect(field.value).toBe("20");

    fireEvent.change(field, { target: { value: "35" } });

    expect(onDurationTextChange).toHaveBeenCalledWith("35");
    expect(screen.queryByText(/Nhập số giây nguyên/)).toBeNull();
  });

  it.each(["9", "41", "12.5", ""])("says why %j is rejected", (typed) => {
    renderControls({ durationText: typed, isDurationValid: false });

    expect(screen.getByText("Nhập số giây nguyên từ 10 đến 40.")).toBeTruthy();
  });

  it("locks the field and the buttons while a round runs", () => {
    renderControls({ isLocked: true });

    expect((screen.getByLabelText("Thời gian đua (giây)") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: /Danh sách đua/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: /Người tham gia/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows the commentary switch with its label and reports a flip", () => {
    const { onCommentaryChange } = renderControls();
    const toggle = screen.getByRole("switch", { name: "Bình luận" });
    expect(toggle.getAttribute("aria-checked")).toBe("true");

    fireEvent.click(toggle);

    expect(onCommentaryChange).toHaveBeenCalledWith(false);
  });

  it("shows the switch off when commentary is off, and locks it while a round runs", () => {
    renderControls({ isCommentaryOn: false, isLocked: true });
    const toggle = screen.getByRole("switch", { name: "Bình luận" });

    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(toggle.hasAttribute("data-disabled")).toBe(true);
  });
});
