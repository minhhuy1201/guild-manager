// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EditorToolbar } from "../components/editor-toolbar";

afterEach(cleanup);

const handlers = {
  onToolChange: vi.fn(),
  onColorChange: vi.fn(),
  onStrokeWidthChange: vi.fn(),
  onUndo: vi.fn(),
  onRedo: vi.fn(),
  onSave: vi.fn(),
  onExport: vi.fn(),
};

/**
 * Render the toolbar of an admin editing a tactic.
 * @param props - Fields to change from the default
 * @returns Nothing
 */
function renderToolbar(
  props: Partial<React.ComponentProps<typeof EditorToolbar>> = {}
) {
  render(
    <EditorToolbar
      tool="token"
      color="blue"
      strokeWidth={4}
      canUndo
      canRedo={false}
      saving={false}
      dirty
      isAdmin
      {...handlers}
      {...props}
    />
  );
}

describe("EditorToolbar", () => {
  it("marks the active tool as pressed", () => {
    renderToolbar();

    expect(
      screen.getByRole("button", { name: "Đội hình" }).getAttribute("aria-pressed")
    ).toBe("true");
  });

  it("reports the tool the user picked", () => {
    renderToolbar();
    fireEvent.click(screen.getByRole("button", { name: "Tẩy" }));

    expect(handlers.onToolChange).toHaveBeenCalledWith("eraser");
  });

  it("reports the colour the user picked", () => {
    renderToolbar();
    fireEvent.click(screen.getByRole("button", { name: "Xanh dương" }));

    expect(handlers.onColorChange).toHaveBeenCalledWith("blue");
  });

  it("disables redo when there is nothing to redo", () => {
    renderToolbar();

    expect(
      screen.getByRole("button", { name: "Làm lại" }).hasAttribute("disabled")
    ).toBe(true);
  });

  it("hides the export button from a member", () => {
    renderToolbar({ isAdmin: false });

    expect(screen.queryByRole("button", { name: "Xuất ảnh" })).toBeNull();
  });

  // Both moved onto the map, under the element they act on — the toolbar is too far from it.
  it("leaves the selected element's own actions to the map", () => {
    renderToolbar();

    expect(screen.queryByRole("button", { name: "Cỡ lớn" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Xoá phần tử/ })).toBeNull();
  });

  it("offers the select tool, which is what editing a placed piece goes through", () => {
    renderToolbar();
    fireEvent.click(screen.getByRole("button", { name: "Chọn" }));

    expect(handlers.onToolChange).toHaveBeenCalledWith("select");
  });
});
