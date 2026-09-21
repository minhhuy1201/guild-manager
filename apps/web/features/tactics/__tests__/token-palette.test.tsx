// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TacticTokenPreset } from "@guild/shared/schemas";

let presets: TacticTokenPreset[] = [];

vi.mock("../hooks/use-token-presets", () => ({
  useTokenPresets: () => ({ data: presets, isPending: false }),
}));

import { TokenPalette } from "../components/token-palette";

afterEach(cleanup);

const handlers = {
  onToggle: vi.fn(),
  onSelect: vi.fn(),
  onManagePresets: vi.fn(),
};

beforeEach(() => {
  presets = [
    { id: "p1", label: "Đội cảm tử", icon: "skull", sortOrder: 1 },
  ];
});

/**
 * Render the palette of an admin with nothing picked yet.
 * @param props - Fields to change from the default
 * @returns Nothing
 */
function renderPalette(
  props: Partial<React.ComponentProps<typeof TokenPalette>> = {}
) {
  render(
    <TokenPalette
      collapsed={false}
      isAdmin
      selected={null}
      {...handlers}
      {...props}
    />
  );
}

describe("TokenPalette", () => {
  it("shows the three groups in order", () => {
    renderPalette();

    expect(
      screen.getAllByRole("heading").map((heading) => heading.textContent)
    ).toEqual(["Quân hiệu", "Đội", "Custom"]);
  });

  it("gives each group its own panel, so the three read apart", () => {
    renderPalette();

    const panels = screen
      .getAllByRole("heading")
      .map((heading) => heading.parentElement as HTMLElement);

    for (const panel of panels) {
      expect(panel.className).toContain("border");
    }
    // One hue per group: the tints must not repeat down the column.
    const tints = panels.map((panel) =>
      panel.className.split(" ").filter((name) => name.startsWith("bg-")).join()
    );
    expect(new Set(tints).size).toBe(panels.length);
  });

  it("files a named role under Quân hiệu and a numbered team under Đội", () => {
    renderPalette();

    const insignia = screen.getByRole("heading", { name: "Quân hiệu" })
      .parentElement as HTMLElement;
    const teams = screen.getByRole("heading", { name: "Đội" })
      .parentElement as HTMLElement;

    expect(insignia.textContent).toContain("Đội công");
    expect(insignia.textContent).not.toContain("Đội 1");
    expect(teams.textContent).toContain("Đội 10");
  });

  it("files a saved preset under Custom", () => {
    renderPalette();

    const custom = screen.getByRole("heading", { name: "Custom" })
      .parentElement as HTMLElement;

    expect(custom.textContent).toContain("Đội cảm tử");
  });

  it("keeps the Custom heading while nothing is saved", () => {
    presets = [];
    renderPalette();

    expect(screen.getByRole("heading", { name: "Custom" })).toBeTruthy();
    expect(screen.getByText("Chưa có quân cờ tự đặt.")).toBeTruthy();
  });

  it("reports the entry the user picked", () => {
    renderPalette();
    fireEvent.click(screen.getByRole("button", { name: "Đội thủ" }));

    expect(handlers.onSelect).toHaveBeenCalledWith({
      label: "Đội thủ",
      icon: "shield",
    });
  });

  it("keeps the toggle reachable once folded, so the palette can be opened again", () => {
    renderPalette({ collapsed: true });

    // The folded column holds the toggle and nothing else: the title is what used to push it out.
    const toggle = screen.getByRole("button", { name: "Mở bảng quân cờ" });

    fireEvent.click(toggle);
    expect(handlers.onToggle).toHaveBeenCalled();
  });

  it("hides the preset manager from a member", () => {
    renderPalette({ isAdmin: false });

    expect(screen.queryByRole("button", { name: /Thêm đội/ })).toBeNull();
  });
});
