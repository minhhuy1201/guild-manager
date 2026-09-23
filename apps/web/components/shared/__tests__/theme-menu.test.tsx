// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ThemeMenu } from "../theme-menu";

// React only batches and flushes state updates inside act() when it knows it is under test.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
// Base UI positions the popup through floating-ui, which watches the anchor with a ResizeObserver.
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
// next-themes reads the colour-scheme media query even with `enableSystem={false}`; jsdom has none.
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener() {},
  removeListener() {},
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => false,
})) as typeof window.matchMedia;

/**
 * Render the menu under the same provider settings as `components/providers.tsx`, then open it.
 */
async function openMenu() {
  render(
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <ThemeMenu />
    </ThemeProvider>
  );

  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Giao diện" }));
  });
}

/**
 * Whether a theme's radio item is the checked one.
 * @param name - Visible name of the item ("Sáng" / "Tối")
 * @returns True when the item is checked
 */
function isChecked(name: string): boolean {
  return (
    screen.getByRole("menuitemradio", { name }).getAttribute("aria-checked") ===
    "true"
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = "";
});

afterEach(cleanup);

describe("ThemeMenu", () => {
  it("mặc định là Sáng, không theo hệ điều hành", async () => {
    await openMenu();

    expect(isChecked("Sáng")).toBe(true);
    expect(isChecked("Tối")).toBe(false);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("chọn Tối thì cả trang chuyển sang tối và lựa chọn được nhớ lại", async () => {
    await openMenu();

    await act(async () => {
      fireEvent.click(screen.getByRole("menuitemradio", { name: "Tối" }));
    });

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("đã chọn Tối từ trước thì mở lại vẫn thấy Tối được đánh dấu", async () => {
    localStorage.setItem("theme", "dark");

    await openMenu();

    expect(isChecked("Tối")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
