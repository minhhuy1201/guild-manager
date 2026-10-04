// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AttendanceStatusIcon } from "../components/attendance-status-icon";

afterEach(cleanup);

/**
 * Name of the lucide glyph rendered inside a container.
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

describe("AttendanceStatusIcon", () => {
  it('"Có" mang thanh kiếm của trận đánh, không phải dấu tick chung', () => {
    const { container } = render(<AttendanceStatusIcon isPresent source="answer" />);

    expect(glyphOf(container)).toBe("swords");
    expect(container.firstElementChild?.className).toContain("bg-emerald-500");
    expect(container.querySelector(".sr-only")?.textContent).toBe("Có");
  });

  it('"Không" mang dấu X trên nền destructive', () => {
    const { container } = render(<AttendanceStatusIcon isPresent={false} source="answer" />);

    expect(glyphOf(container)).toBe("x");
    expect(container.firstElementChild?.className).toContain("bg-destructive");
    expect(container.querySelector(".sr-only")?.textContent).toBe("Không");
  });

  it('"Không" từ lần nghỉ mang nhãn "Không · Nghỉ phép" và hình máy bay', () => {
    const { container } = render(
      <AttendanceStatusIcon isPresent={false} source="leave" />
    );

    expect(glyphOf(container)).toBe("plane");
    expect(container.firstElementChild?.className).toContain("bg-destructive");
    expect(container.querySelector(".sr-only")?.textContent).toBe(
      "Không · Nghỉ phép"
    );
  });

  it("className được chuyển tiếp xuống StatusIcon", () => {
    const { container } = render(
      <AttendanceStatusIcon isPresent source="answer" className="size-5" />
    );

    expect(container.firstElementChild?.className).toContain("size-5");
  });
});
