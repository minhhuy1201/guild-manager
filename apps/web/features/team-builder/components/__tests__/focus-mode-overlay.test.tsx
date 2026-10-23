// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FocusModeOverlay } from "../focus-mode-overlay";

afterEach(cleanup);

/**
 * Render the overlay with a roving tablist whose first tab is not a Tab stop, as when match 2 is
 * the selected one.
 */
function renderWithSecondTabSelected() {
  render(
    <FocusModeOverlay
      title="Bang chiến"
      onExit={vi.fn()}
      matchTabs={
        <div role="tablist">
          <button type="button" role="tab" tabIndex={-1}>
            Trận 1
          </button>
          <button type="button" role="tab" tabIndex={0}>
            Trận 2
          </button>
        </div>
      }
      notice={null}
      footer={null}
      grid={<div />}
      pool={<button type="button">Thành viên</button>}
    />
  );
}

describe("FocusModeOverlay - bẫy focus", () => {
  it("Shift+Tab từ tab đang chọn vòng về nút cuối, bỏ qua tab không phải điểm dừng", () => {
    renderWithSecondTabSelected();
    const selected = screen.getByRole("tab", { name: "Trận 2" });
    selected.focus();

    fireEvent.keyDown(selected, { key: "Tab", shiftKey: true });

    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Thành viên" })
    );
  });

  it("Tab từ nút cuối vòng về tab đang chọn", () => {
    renderWithSecondTabSelected();
    const last = screen.getByRole("button", { name: "Thành viên" });
    last.focus();

    fireEvent.keyDown(last, { key: "Tab" });

    expect(document.activeElement).toBe(
      screen.getByRole("tab", { name: "Trận 2" })
    );
  });
});
