// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EditorToolbar } from "../components/editor-toolbar";

afterEach(cleanup);

const handlers = {
  onToolChange: vi.fn(),
  onColorChange: vi.fn(),
  onStrokeWidthChange: vi.fn(),
  onTokenSizeChange: vi.fn(),
  onDeleteSelected: vi.fn(),
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
      selectedTokenSize={null}
      hasSelection={false}
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

  it("offers the size buttons only while a token is selected", () => {
    renderToolbar();
    expect(screen.queryByRole("button", { name: "Cỡ lớn" })).toBeNull();

    cleanup();
    renderToolbar({ selectedTokenSize: "md", hasSelection: true });
    fireEvent.click(screen.getByRole("button", { name: "Cỡ lớn" }));

    expect(handlers.onTokenSizeChange).toHaveBeenCalledWith("lg");
  });

  it("offers the select tool, which is what editing a placed piece goes through", () => {
    renderToolbar();
    fireEvent.click(screen.getByRole("button", { name: "Chọn" }));

    expect(handlers.onToolChange).toHaveBeenCalledWith("select");
  });

  // Every element can be deleted, so the button answers to a selection, not to a token.
  it("deletes the selected element, whatever kind it is", () => {
    renderToolbar();
    expect(screen.queryByRole("button", { name: /Xoá phần tử/ })).toBeNull();

    cleanup();
    renderToolbar({ hasSelection: true });
    fireEvent.click(screen.getByRole("button", { name: /Xoá phần tử/ }));

    expect(handlers.onDeleteSelected).toHaveBeenCalled();
  });
});
