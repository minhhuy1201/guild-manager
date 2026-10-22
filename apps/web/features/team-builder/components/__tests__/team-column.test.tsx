// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TeamColumn } from "../team-column";

afterEach(cleanup);

/**
 * Render an empty column for one team.
 * @param team - Team number
 * @returns The card element
 */
function renderColumn(team: number): HTMLElement {
  const { container } = render(
    <TeamColumn
      team={team}
      name=""
      onNameChange={() => {}}
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
});
