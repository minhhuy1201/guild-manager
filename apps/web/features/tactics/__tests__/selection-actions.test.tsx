// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SelectionActions } from "../components/selection-actions";

afterEach(cleanup);

const handlers = {
  onTokenSizeChange: vi.fn(),
  onDeleteSelected: vi.fn(),
};

/**
 * Render the floating action bar of a selected element.
 * @param props - Fields to change from the default
 * @returns Nothing
 */
function renderActions(
  props: Partial<React.ComponentProps<typeof SelectionActions>> = {}
) {
  render(
    <SelectionActions
      placement={{ left: 400, top: 260, above: false }}
      tokenSize="md"
      {...handlers}
      {...props}
    />
  );
}

describe("SelectionActions", () => {
  it("sits where the placement puts it, on the map rather than in the toolbar", () => {
    renderActions();

    const bar = screen.getByRole("toolbar", { name: "Sửa phần tử đang chọn" });

    expect(bar.style.left).toBe("400px");
    expect(bar.style.top).toBe("260px");
  });

  it("marks the selected token's size as pressed", () => {
    renderActions();

    expect(
      screen.getByRole("button", { name: "Cỡ vừa" }).getAttribute("aria-pressed")
    ).toBe("true");
  });

  it("reports the size the user picked", () => {
    renderActions();
    fireEvent.click(screen.getByRole("button", { name: "Cỡ lớn" }));

    expect(handlers.onTokenSizeChange).toHaveBeenCalledWith("lg");
  });

  it("offers no size buttons for an element that is not a token", () => {
    renderActions({ tokenSize: null });

    expect(screen.queryByRole("button", { name: "Cỡ lớn" })).toBeNull();
  });

  // Every kind of element can be deleted, so this button answers to the selection, not the token.
  it("deletes the selected element, whatever kind it is", () => {
    renderActions({ tokenSize: null });
    fireEvent.click(screen.getByRole("button", { name: "Xoá phần tử" }));

    expect(handlers.onDeleteSelected).toHaveBeenCalled();
  });

  it("hangs above the element when the placement says so", () => {
    cleanup();
    renderActions({ placement: { left: 10, top: 40, above: true } });

    expect(
      screen
        .getByRole("toolbar", { name: "Sửa phần tử đang chọn" })
        .className.includes("-translate-y-full")
    ).toBe(true);
  });
});
