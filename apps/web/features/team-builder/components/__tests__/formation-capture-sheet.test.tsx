// @vitest-environment jsdom
import { DndContext } from "@dnd-kit/core";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GuildClass } from "@guild/shared/enums";
import type { Character, SessionFormation } from "@guild/shared/schemas";

import type { MatchDraft } from "../../types/formation";

// The banner title reads `getSessionSubtitle` from the attendance barrel, which also carries that
// feature's server actions and therefore `server-only` — harmless here, since no action ever runs.
// Same stub as `banner-title.test.ts`.
vi.mock("server-only", () => ({}));

const { CAPTURE_NODE_ATTRIBUTE, FormationCaptureSheet } = await import(
  "../formation-capture-sheet"
);
const {
  TEAM_CAPTURE_MATCH_ATTRIBUTE,
  TEAM_CAPTURE_MEMBERS_ATTRIBUTE,
  TEAM_CAPTURE_TEAM_ATTRIBUTE,
} = await import("../../lib/team-capture-attributes");

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
  version: 0,
};

const EMPTY_MATCH: MatchDraft = { assignment: {}, notes: {} };

/**
 * Render the sheet for a day with the given matches.
 * @param matches - Matches of the day
 * @returns The rendered container
 */
function renderSheet(
  matches: MatchDraft[],
  charactersById: Map<string, Character> = new Map()
) {
  return render(
    <DndContext>
      <FormationCaptureSheet
        session={SESSION}
        matches={matches}
        charactersById={charactersById}
        absentIds={new Set()}
        names={{}}
        colors={{}}
        icons={{}}
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

describe("FormationCaptureSheet - card từng team", () => {
  const KIRITO: Character = { id: "kirito", name: "Kirito", guildClass: GuildClass.THIET_Y };
  const ASUNA: Character = { id: "asuna", name: "Asuna", guildClass: GuildClass.THIET_Y };
  const CHARACTERS = new Map([
    ["kirito", KIRITO],
    ["asuna", ASUNA],
  ]);

  /**
   * The team cards the sheet marked, as match:team pairs.
   * @param container - The rendered container
   * @returns One string per marked card, in document order
   */
  function markedPairs(container: HTMLElement): string[] {
    return Array.from(
      container.querySelectorAll(`[${TEAM_CAPTURE_MATCH_ATTRIBUTE}]`)
    ).map(
      (card) =>
        `${card.getAttribute(TEAM_CAPTURE_MATCH_ATTRIBUTE)}:${card.getAttribute(TEAM_CAPTURE_TEAM_ATTRIBUTE)}`
    );
  }

  it("chỉ card của team có người được đánh dấu, mang số trận 1-based và số team", () => {
    const { container } = renderSheet(
      [
        { assignment: { "team-1-pos-1": "kirito", "team-3-pos-2": "asuna" }, notes: {} },
        { assignment: { "team-3-pos-1": "kirito" }, notes: {} },
      ],
      CHARACTERS
    );

    expect(markedPairs(container)).toEqual(["1:1", "1:3", "2:3"]);
  });

  it("card ghi id người đứng trong team, để nhắn lại chọn đúng card", () => {
    const { container } = renderSheet(
      [{ assignment: { "team-1-pos-1": "kirito", "team-1-pos-2": "asuna" }, notes: {} }],
      CHARACTERS
    );
    const card = container.querySelector(`[${TEAM_CAPTURE_MATCH_ATTRIBUTE}]`) as HTMLElement;

    expect(card.getAttribute(TEAM_CAPTURE_MEMBERS_ATTRIBUTE)).toBe("kirito asuna");
  });

  it("đội hình trống thì không card nào được đánh dấu", () => {
    const { container } = renderSheet([EMPTY_MATCH, EMPTY_MATCH]);

    expect(markedPairs(container)).toEqual([]);
  });
});
