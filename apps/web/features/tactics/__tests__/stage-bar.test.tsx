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

  it("wears a clock face and its number per stage, name left to the accessible one", () => {
    renderBar();

    const first = screen.getByRole("tab", { name: "Giai đoạn 1" });
    const second = screen.getByRole("tab", { name: "Giai đoạn 2" });

    expect(first.querySelector(".lucide-clock-1")).toBeTruthy();
    expect(first.textContent).toContain("1");
    expect(second.querySelector(".lucide-clock-2")).toBeTruthy();
    expect(second.textContent).toContain("2");
    // The name is there for a screen reader, not on screen beside the face.
    expect(first.querySelector(".sr-only")?.textContent).toBe("Giai đoạn 1");
  });

  it("falls back to the plain face past the twelfth stage, number and all", () => {
    renderBar({
      stages: Array.from({ length: 13 }, (_, index) => ({
        id: `s${index}`,
        name: `Giai đoạn ${index + 1}`,
        elements: [],
      })),
      activeStageId: "s0",
    });

    const thirteenth = screen.getByRole("tab", { name: /Giai đoạn 13/ });

    expect(thirteenth.querySelector(".lucide-clock")).toBeTruthy();
    expect(thirteenth.textContent).toContain("13");
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

  it("duplicates and deletes the stage that is open", () => {
    renderBar();

    fireEvent.click(screen.getByRole("button", { name: /Nhân bản/ }));
    expect(handlers.onDuplicate).toHaveBeenCalledWith("s1");

    fireEvent.click(screen.getByRole("button", { name: /Xoá giai đoạn/ }));
    expect(handlers.onRemove).toHaveBeenCalledWith("s1");

    fireEvent.click(screen.getByRole("button", { name: /Thêm giai đoạn/ }));
    expect(handlers.onAdd).toHaveBeenCalled();
  });

  it("commits a rename on Enter and abandons it on Escape", () => {
    renderBar();

    fireEvent.doubleClick(screen.getByRole("tab", { name: "Giai đoạn 1" }));
    const field = screen.getByLabelText("Tên giai đoạn");
    fireEvent.change(field, { target: { value: "Mở màn" } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(handlers.onRename).toHaveBeenCalledWith("s1", "Mở màn");

    fireEvent.doubleClick(screen.getByRole("tab", { name: "Giai đoạn 1" }));
    fireEvent.keyDown(screen.getByLabelText("Tên giai đoạn"), {
      key: "Escape",
    });
    expect(screen.getByRole("tab", { name: "Giai đoạn 1" })).toBeTruthy();
  });

  it("keeps a blank rename from wiping the stage's name", () => {
    renderBar();

    fireEvent.doubleClick(screen.getByRole("tab", { name: "Giai đoạn 1" }));
    const field = screen.getByLabelText("Tên giai đoạn");
    fireEvent.change(field, { target: { value: "   " } });
    fireEvent.blur(field);

    expect(handlers.onRename).not.toHaveBeenCalled();
  });

  it("does not let a member rename a stage by double-clicking it", () => {
    renderBar({ isAdmin: false });

    fireEvent.doubleClick(screen.getByRole("tab", { name: "Giai đoạn 1" }));

    expect(screen.queryByLabelText("Tên giai đoạn")).toBeNull();
  });

  it("walks the stages with the arrow keys", () => {
    renderBar();

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(handlers.onSelect).toHaveBeenCalledWith("s2");
  });

  it("leaves the arrow keys to the rename field", () => {
    renderBar();
    fireEvent.doubleClick(screen.getByRole("tab", { name: "Giai đoạn 1" }));

    fireEvent.keyDown(screen.getByLabelText("Tên giai đoạn"), {
      key: "ArrowRight",
    });

    expect(handlers.onSelect).not.toHaveBeenCalled();
  });

  it("hides every write action from a member", () => {
    renderBar({ isAdmin: false });

    expect(screen.queryByRole("button", { name: /Thêm giai đoạn/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Nhân bản/ })).toBeNull();
  });
});
