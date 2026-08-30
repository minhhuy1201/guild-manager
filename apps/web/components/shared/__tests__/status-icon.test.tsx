// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Swords } from "lucide-react";

import { StatusIcon } from "../status-icon";

afterEach(cleanup);

/**
 * Name of the lucide glyph rendered inside a container.
 * Lucide stamps every icon with a `lucide-<name>` class, which is the only handle a test has on
 * which glyph was picked.
 * @param container - Element the component rendered into
 * @returns The glyph name, or null when nothing was rendered
 */
function glyphOf(container: HTMLElement): string | null {
  const svg = container.querySelector("svg");
  const name = [...(svg?.classList ?? [])].find(
    (token) => token.startsWith("lucide-") && token !== "lucide-icon"
  );

  return name?.replace("lucide-", "") ?? null;
}

describe("StatusIcon", () => {
  it("tone success mặc định là dấu tick trên nền emerald", () => {
    const { container } = render(<StatusIcon tone="success" label="Đạt" />);

    expect(glyphOf(container)).toBe("check");
    expect(container.firstElementChild?.className).toContain("bg-emerald-500");
  });

  it("tone danger mặc định là dấu X trên nền destructive", () => {
    const { container } = render(<StatusIcon tone="danger" label="Hỏng" />);

    expect(glyphOf(container)).toBe("x");
    expect(container.firstElementChild?.className).toContain("bg-destructive");
  });

  it("icon truyền vào thay glyph mặc định nhưng giữ nguyên tone", () => {
    const { container } = render(
      <StatusIcon tone="success" label="Có" icon={Swords} />
    );

    expect(glyphOf(container)).toBe("swords");
    expect(container.firstElementChild?.className).toContain("bg-emerald-500");
  });

  it("nhãn chỉ dành cho trình đọc màn hình", () => {
    const { container } = render(<StatusIcon tone="danger" label="Không" />);

    expect(container.querySelector(".sr-only")?.textContent).toBe("Không");
  });

  it("className được gộp sau class mặc định để ghi đè được cỡ", () => {
    const { container } = render(
      <StatusIcon tone="success" label="Đạt" className="size-5" />
    );

    expect(container.firstElementChild?.className).toContain("size-5");
  });
});
