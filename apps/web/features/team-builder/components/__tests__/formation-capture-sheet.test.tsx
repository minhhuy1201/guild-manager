// @vitest-environment jsdom
import { DndContext } from "@dnd-kit/core";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SessionFormation } from "@guild/shared/schemas";

import type { MatchDraft } from "../../types/formation";

// The banner title reads `getSessionSubtitle` from the attendance barrel, which also carries that
// feature's server actions and therefore `server-only` — harmless here, since no action ever runs.
// Same stub as `banner-title.test.ts`.
vi.mock("server-only", () => ({}));

const { CAPTURE_NODE_ATTRIBUTE, FormationCaptureSheet } = await import(
  "../formation-capture-sheet"
);

afterEach(cleanup);

const SESSION: SessionFormation = {
  sessionId: "session-1",
  label: "Thứ 4 · 20:30",
  dateTime: "2026-08-19T13:30:00.000Z",
  isGuildWar: false,
  matchCount: 2,
  opponent: "Moonlight",
  locked: false,
  matches: [],
};

const EMPTY_MATCH: MatchDraft = { assignment: {}, notes: {} };

/**
 * Render the sheet for a day with the given matches.
 * @param matches - Matches of the day
 * @returns The rendered container
 */
function renderSheet(matches: MatchDraft[]) {
  return render(
    <DndContext>
      <FormationCaptureSheet
        session={SESSION}
        matches={matches}
        charactersById={new Map()}
        absentIds={new Set()}
        names={{}}
      />
    </DndContext>
  );
}

describe("FormationCaptureSheet", () => {
  it("một node chụp cho mỗi trận của ngày", () => {
    const { container } = renderSheet([EMPTY_MATCH, EMPTY_MATCH]);

    expect(
      container.querySelectorAll(`[${CAPTURE_NODE_ATTRIBUTE}]`).length
    ).toBe(2);
  });

  // The image must not change with the window width of whoever pressed the button.
  it("ép lưới 5 cột thay vì bộ class responsive", () => {
    const { container } = renderSheet([EMPTY_MATCH]);
    const grid = container.querySelector(".grid") as HTMLElement;

    expect(grid.className).toContain("grid-cols-5");
    expect(grid.className).not.toContain("lg:grid-cols-5");
  });

  // The screen collapses the notes and the banner, while the image sent to Discord stays as it
  // was.
  it("mỗi ô trong ảnh vẫn có cột ghi chú", () => {
    const { container } = renderSheet([EMPTY_MATCH]);

    expect(container.querySelectorAll("textarea").length).toBe(60);
  });

  it("banner trong ảnh vẫn là tiêu đề cao, vì ảnh không có tab ngày", () => {
    const { container } = renderSheet([EMPTY_MATCH]);
    const banner = container.querySelector("h2") as HTMLElement;

    expect(banner.className).toContain("min-h-24");
  });

  it("banner của mỗi trận nói đúng số thứ tự trận", () => {
    const { container } = renderSheet([EMPTY_MATCH, EMPTY_MATCH]);
    const nodes = container.querySelectorAll(`[${CAPTURE_NODE_ATTRIBUTE}]`);

    expect(nodes[0].textContent).toContain("trận 1/2");
    expect(nodes[1].textContent).toContain("trận 2/2");
  });
});
