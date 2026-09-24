// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PaletteDragPreview } from "../components/palette-drag-preview";
import { COLOR_HEX, TEAM_GROUP_HEX, TOKEN_FILL, TOKEN_RADIUS } from "../lib/token-icon";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/**
 * Fire a dragover on the document with the pointer at a point. jsdom has no DragEvent, so a
 * MouseEvent stands in: it is the part of the event the preview reads.
 * @param x - Pointer position along x, in CSS pixels
 * @param y - Pointer position along y, in CSS pixels
 */
function dragOverAt(x: number, y: number): void {
  act(() => {
    document.dispatchEvent(
      new MouseEvent("dragover", { clientX: x, clientY: y, bubbles: true })
    );
  });
}

/**
 * A colour as jsdom writes it back once set on a style, so a hex and an rgb() can be compared.
 * @param value - Any CSS colour
 * @returns The same colour in jsdom's own notation
 */
function cssColor(value: string): string {
  const probe = document.createElement("div");
  probe.style.color = value;

  return probe.style.color;
}

describe("PaletteDragPreview", () => {
  it("shows nothing until the first dragover says where the pointer is", () => {
    render(
      <PaletteDragPreview
        token={{ label: "Trinh sát", icon: "eye" }}
        color="blue"
        size="md"
        scale={0.5}
      />
    );

    expect(screen.queryByTestId("palette-drag-preview")).toBeNull();
  });

  it("draws the token solid, centred on the pointer, at the size it lands at", () => {
    render(
      <PaletteDragPreview
        token={{ label: "Trinh sát", icon: "eye" }}
        color="red"
        size="lg"
        scale={0.5}
      />
    );

    dragOverAt(300, 200);

    const preview = screen.getByTestId("palette-drag-preview");
    const diameter = TOKEN_RADIUS.lg * 2 * 0.5;
    expect(preview.style.left).toBe(`${300 - diameter / 2}px`);
    expect(preview.style.top).toBe(`${200 - diameter / 2}px`);
    expect(preview.style.width).toBe(`${diameter}px`);
    expect(preview.style.opacity).toBe("");
    expect(preview.className).toContain("pointer-events-none");
    expect(preview.style.backgroundColor).toBe(cssColor(TOKEN_FILL.red));
    expect(preview.style.color).toBe(cssColor(COLOR_HEX.red));
    expect(preview.style.borderColor).toBe(cssColor(COLOR_HEX.red));

    dragOverAt(320, 240);
    expect(preview.style.left).toBe(`${320 - diameter / 2}px`);
  });

  it("borders a numbered team in its team builder colour, as on the map", () => {
    render(
      <PaletteDragPreview
        token={{ label: "Đội 1", icon: "number-1" }}
        color="blue"
        size="md"
        scale={1}
      />
    );

    dragOverAt(10, 10);

    const border = screen.getByTestId("palette-drag-preview").style.borderColor;
    expect(border).not.toBe(cssColor(COLOR_HEX.blue));
    expect(Object.values(TEAM_GROUP_HEX).map(cssColor)).toContain(border);
  });

  it("stops listening once it is gone", () => {
    const remove = vi.spyOn(document, "removeEventListener");
    const { unmount } = render(
      <PaletteDragPreview
        token={{ label: "Trinh sát", icon: "eye" }}
        color="blue"
        size="md"
        scale={1}
      />
    );

    unmount();

    expect(remove).toHaveBeenCalledWith("dragover", expect.any(Function));
  });
});
