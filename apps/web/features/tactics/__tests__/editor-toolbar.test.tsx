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
      color="red"
      strokeWidth={4}
      canUndo
      canRedo={false}
      saving={false}
      dirty
      isAdmin
      selectedTokenSize={null}
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
    fireEvent.click(screen.getByRole("button", { name: "Xanh" }));

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
    renderToolbar({ selectedTokenSize: "md" });
    fireEvent.click(screen.getByRole("button", { name: "Cỡ lớn" }));

    expect(handlers.onTokenSizeChange).toHaveBeenCalledWith("lg");
  });
});
