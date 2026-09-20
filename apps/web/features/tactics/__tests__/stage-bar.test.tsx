// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TacticStage } from "@guild/shared/schemas";

import { StageBar } from "../components/stage-bar";

afterEach(cleanup);

const handlers = {
  onSelect: vi.fn(),
  onAdd: vi.fn(),
  onDuplicate: vi.fn(),
  onRename: vi.fn(),
  onRemove: vi.fn(),
};

const stages: TacticStage[] = [
  { id: "s1", name: "Giai đoạn 1", elements: [] },
  { id: "s2", name: "Giai đoạn 2", elements: [] },
];

/**
 * Render the strip of an admin looking at the first stage.
 * @param props - Fields to change from the default
 * @returns Nothing
 */
function renderBar(props: Partial<React.ComponentProps<typeof StageBar>> = {}) {
  render(
    <StageBar
      stages={stages}
      activeStageId="s1"
      isAdmin
      {...handlers}
      {...props}
    />
  );
}

describe("StageBar", () => {
  it("marks the open stage as the selected tab", () => {
    renderBar();

    expect(
      screen.getByRole("tab", { name: "Giai đoạn 1" }).getAttribute("aria-selected")
    ).toBe("true");
  });

  it("reports the stage the user opened", () => {
    renderBar();
    fireEvent.click(screen.getByRole("tab", { name: "Giai đoạn 2" }));

    expect(handlers.onSelect).toHaveBeenCalledWith("s2");
  });

  it("renames a stage from a double click", () => {
    renderBar();
    fireEvent.doubleClick(screen.getByRole("tab", { name: "Giai đoạn 1" }));

    const field = screen.getByLabelText("Tên giai đoạn");
    fireEvent.change(field, { target: { value: "Mở màn" } });
    fireEvent.blur(field);

    expect(handlers.onRename).toHaveBeenCalledWith("s1", "Mở màn");
  });

  it("refuses to add a twenty-first stage", () => {
    renderBar({
      stages: Array.from({ length: 20 }, (_, index) => ({
        id: `s${index}`,
        name: `Giai đoạn ${index + 1}`,
        elements: [],
      })),
    });

    const add = screen.getByRole("button", { name: /Thêm giai đoạn/ });
    expect(add.hasAttribute("disabled")).toBe(true);
    expect(add.getAttribute("title")).toBe(
      "Một chiến thuật tối đa 20 giai đoạn."
    );
  });

  it("refuses to delete the last stage left", () => {
    renderBar({ stages: [stages[0]] });

    expect(
      screen
        .getByRole("button", { name: /Xoá giai đoạn/ })
        .hasAttribute("disabled")
    ).toBe(true);
  });

  it("hides every write action from a member", () => {
    renderBar({ isAdmin: false });

    expect(screen.queryByRole("button", { name: /Thêm giai đoạn/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Nhân bản/ })).toBeNull();
  });
});
