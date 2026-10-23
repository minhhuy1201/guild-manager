// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ThemeSwitch } from "../theme-switch";

// React only batches and flushes state updates inside act() when it knows it is under test.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
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

/** Render the switch under the same provider settings as `components/providers.tsx`. */
function renderSwitch() {
  render(
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <ThemeSwitch />
    </ThemeProvider>
  );
  return screen.getByRole("switch", { name: "Chế độ tối" });
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = "";
});

afterEach(cleanup);

describe("ThemeSwitch", () => {
  it("mặc định là Sáng, không theo hệ điều hành", () => {
    const toggle = renderSwitch();

    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("bấm thì cả trang chuyển sang tối và lựa chọn được nhớ lại", async () => {
    const toggle = renderSwitch();

    await act(async () => {
      fireEvent.click(toggle);
    });

    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("bấm lần nữa thì quay về sáng", async () => {
    localStorage.setItem("theme", "dark");
    const toggle = renderSwitch();

    await act(async () => {
      fireEvent.click(toggle);
    });

    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("theme")).toBe("light");
  });

  it("đã chọn Tối từ trước thì mở lại vẫn thấy công tắc ở Tối", () => {
    localStorage.setItem("theme", "dark");

    const toggle = renderSwitch();

    expect(toggle.getAttribute("aria-checked")).toBe("true");
  });
});
