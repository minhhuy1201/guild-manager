// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TeamColor, TeamIcon } from "@guild/shared/enums";
import type { TeamColors, TeamIcons } from "@guild/shared/schemas";

import { TeamColumn } from "../team-column";

afterEach(cleanup);

/**
 * Render an empty column for one team.
 * @param team - Team number
 * @param colors - Chosen colours
 * @param readOnly - Render without the colour button
 * @param icons - Chosen icons
 * @returns The card element
 */
function renderColumn(
  team: number,
  colors: TeamColors = {},
  readOnly = false,
  icons: TeamIcons = {}
): HTMLElement {
  const { container } = render(
    <TeamColumn
      team={team}
      name=""
      onNameChange={() => {}}
      colors={colors}
      onColorChange={() => {}}
      icons={icons}
      onIconChange={() => {}}
      readOnly={readOnly}
      slots={[]}
      occupants={new Map()}
      absentIds={new Set()}
      notes={{}}
      onNoteChange={() => {}}
    />
  );

  return container.firstElementChild as HTMLElement;
}

describe("TeamColumn", () => {
  it("có chấm màu đội, chỉ để trang trí", () => {
    const card = renderColumn(1);

    const marker = card.querySelector('[data-slot="team-marker"]');
    expect(marker).not.toBeNull();
    expect(marker?.getAttribute("aria-hidden")).toBe("true");
  });

  it("đội có icon thì icon mang màu đội thay cho chấm", () => {
    const card = renderColumn(1, { "1": TeamColor.RED }, false, {
      "1": TeamIcon.SWORDS,
    });

    expect(card.querySelector('[data-slot="team-marker"]')).toBeNull();
    const icon = card.querySelector('[data-slot="team-icon"]');
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
    expect(icon?.getAttribute("class")).toContain("text-red");
  });

  it("không có vạch màu nào chạm mép trên của card", () => {
    const card = renderColumn(1);

    const overlays = Array.from(card.children).filter(
      (child) => child.getAttribute("aria-hidden") === "true"
    );
    expect(overlays).toHaveLength(0);
  });

  it("đội khác nhóm màu thì chấm khác màu", () => {
    const jade = renderColumn(1).querySelector('[data-slot="team-marker"]');
    const gold = renderColumn(9).querySelector('[data-slot="team-marker"]');

    expect(jade?.className).not.toBe(gold?.className);
  });

  it("màu đã chọn thắng màu nhóm mặc định", () => {
    const chosen = renderColumn(1, { "1": TeamColor.RED }).querySelector(
      '[data-slot="team-marker"]'
    );
    const byDefault = renderColumn(1).querySelector('[data-slot="team-marker"]');

    expect(chosen?.className).toContain("bg-red");
    expect(byDefault?.className).not.toContain("bg-red");
  });

  it("readOnly: chấm tĩnh, không có nút", () => {
    const card = renderColumn(1, { "1": TeamColor.RED }, true);

    expect(card.querySelector('[data-slot="team-marker"]')).not.toBeNull();
    expect(card.querySelector("button")).toBeNull();
  });
});
