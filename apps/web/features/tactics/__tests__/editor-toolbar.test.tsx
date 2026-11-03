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
  onDeleteSelected: vi.fn(),
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
      tokenSize="md"
      canUndo
      canRedo={false}
      saving={false}
      dirty
      canEdit
      selectedCount={0}
      selectedTokenSizes={[]}
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
    renderToolbar({ canEdit: false });

    expect(screen.queryByRole("button", { name: "Xuất ảnh" })).toBeNull();
  });

  // The size group sets what new tokens take, so it is named for that rather than for the selection.
  it("offers a token size group starting on the middle size", () => {
    renderToolbar();

    expect(
      screen.getByRole("button", { name: "Cỡ quân cờ: Vừa" }).getAttribute("aria-pressed")
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: "Cỡ quân cờ: Lớn" }).getAttribute("aria-pressed")
    ).toBe("false");
  });

  it("reports the token size the user picked", () => {
    renderToolbar();
    fireEvent.click(screen.getByRole("button", { name: "Cỡ quân cờ: Nhỏ" }));

    expect(handlers.onTokenSizeChange).toHaveBeenCalledWith("sm");
  });

  it("marks the selected tokens' size rather than the size new tokens take", () => {
    renderToolbar({ selectedCount: 2, selectedTokenSizes: ["lg", "lg"] });

    expect(
      screen.getByRole("button", { name: "Cỡ quân cờ: Lớn" }).getAttribute("aria-pressed")
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: "Cỡ quân cờ: Vừa" }).getAttribute("aria-pressed")
    ).toBe("false");
  });

  it("marks no size while the selected tokens wear different ones", () => {
    renderToolbar({ selectedCount: 2, selectedTokenSizes: ["sm", "lg"] });

    for (const label of ["Nhỏ", "Vừa", "Lớn"]) {
      expect(
        screen
          .getByRole("button", { name: `Cỡ quân cờ: ${label}` })
          .getAttribute("aria-pressed")
      ).toBe("false");
    }
  });

  it("counts the selection", () => {
    renderToolbar({ selectedCount: 3, selectedTokenSizes: ["md"] });

    expect(screen.getByText("Đã chọn 3")).toBeTruthy();
  });

  it("disables delete while nothing is selected", () => {
    renderToolbar();

    expect(
      screen
        .getByRole("button", { name: "Xoá phần tử đang chọn" })
        .hasAttribute("disabled")
    ).toBe(true);
  });

  it("deletes the selection from the toolbar", () => {
    renderToolbar({ selectedCount: 1, selectedTokenSizes: [] });
    fireEvent.click(screen.getByRole("button", { name: "Xoá phần tử đang chọn" }));

    expect(handlers.onDeleteSelected).toHaveBeenCalled();
  });

  it("hides the selection group from a member", () => {
    renderToolbar({ canEdit: false });

    expect(
      screen.queryByRole("button", { name: "Xoá phần tử đang chọn" })
    ).toBeNull();
  });

  it("offers the select tool, which is what editing a placed piece goes through", () => {
    renderToolbar();
    fireEvent.click(screen.getByRole("button", { name: "Chọn" }));

    expect(handlers.onToolChange).toHaveBeenCalledWith("select");
  });
});
