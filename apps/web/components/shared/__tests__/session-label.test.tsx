// @vitest-environment jsdom
import type { ReactElement } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { formatDateTime } from "@/lib/format";
import {
  SessionDeadline,
  SessionLabel,
  sessionTintClass,
} from "../session-label";

afterEach(cleanup);

// React chỉ gộp và xả state update trong act() khi biết mình đang bị test.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const GUILD_WAR = { label: "Thứ 7 · Bang Chiến", isGuildWar: true };
const SCRIM = { label: "Thứ 3 · 20:30", isGuildWar: false };

/**
 * Render a SessionLabel and hand back the row element it produced.
 * @param element - The SessionLabel to render
 * @returns The row element, which is the only child of the container
 */
function renderRow(element: ReactElement): HTMLElement {
  const { container } = render(element);

  return container.firstElementChild as HTMLElement;
}

describe("sessionTintClass", () => {
  it("Guild War được tô nhạt", () => {
    expect(sessionTintClass(true)).toBe("border-primary/40 bg-primary/5");
  });

  it("trận thường không tô gì", () => {
    expect(sessionTintClass(false)).toBe("");
  });
});

describe("SessionLabel", () => {
  it("Guild War có icon và chữ màu primary", () => {
    const row = renderRow(<SessionLabel session={GUILD_WAR} />);

    expect(row.querySelector("svg")).not.toBeNull();
    expect(row.className).toContain("text-primary");
    expect(row.textContent).toBe("Thứ 7 · Bang Chiến");
  });

  it("trận thường không có icon và không đổi màu chữ", () => {
    const row = renderRow(<SessionLabel session={SCRIM} />);

    expect(row.querySelector("svg")).toBeNull();
    expect(row.className).not.toContain("text-primary");
  });

  it('size mặc định "md" cho icon size-4', () => {
    const row = renderRow(<SessionLabel session={GUILD_WAR} />);

    expect(row.querySelector("svg")?.getAttribute("class")).toContain("size-4");
  });

  it('size "sm" cho icon size-3.5 — cỡ của ô hẹp', () => {
    const row = renderRow(<SessionLabel session={GUILD_WAR} size="sm" />);
    const iconClass = row.querySelector("svg")?.getAttribute("class") ?? "";

    expect(iconClass).toContain("size-3.5");
    expect(iconClass).not.toContain("size-4");
  });

  it("children nằm sau nhãn, trong cùng một hàng", () => {
    const row = renderRow(
      <SessionLabel session={GUILD_WAR}>
        <span>Đã khoá</span>
      </SessionLabel>
    );

    expect(row.textContent).toBe("Thứ 7 · Bang ChiếnĐã khoá");
  });
});

describe("SessionDeadline", () => {
  it("hiện hạn chót đã định dạng", () => {
    const deadline = "2026-08-22T12:00:00.000Z";
    const { container } = render(<SessionDeadline session={{ deadline }} />);

    expect(container.textContent).toBe(`Hạn chót: ${formatDateTime(deadline)}`);
  });
});
