// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FocusModeOverlay } from "../focus-mode-overlay";

afterEach(cleanup);

describe("FocusModeOverlay", () => {
  it("là dialog xếp đội toàn màn hình, tên trận và các phần nằm trong đó", () => {
    render(
      <FocusModeOverlay
        title="Bang chiến"
        onExit={vi.fn()}
        matchTabs={<div role="tablist" />}
        notice={<p>Vắng 2</p>}
        footer={<p>Chưa lưu</p>}
        grid={<p>Lưới</p>}
        pool={<p>Danh sách</p>}
      />
    );

    const dialog = screen.getByRole("dialog", { name: "Xếp đội hình toàn màn hình" });
    expect(dialog.contains(screen.getByRole("heading", { name: "Bang chiến" }))).toBe(true);
    for (const text of ["Vắng 2", "Chưa lưu", "Lưới", "Danh sách"]) {
      expect(dialog.contains(screen.getByText(text))).toBe(true);
    }
    expect(screen.getByRole("tablist")).toBeTruthy();
  });
});
