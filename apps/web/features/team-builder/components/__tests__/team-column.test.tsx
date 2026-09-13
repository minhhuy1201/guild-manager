// @vitest-environment jsdom
import { DndContext } from "@dnd-kit/core";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GuildClass } from "@guild/shared/enums";
import type { Character } from "@guild/shared/schemas";

import { FORMATION } from "../../lib/mock-formation";
import { TeamColumn } from "../team-column";

afterEach(cleanup);

const TEAM_ONE = FORMATION.slots.filter((slot) => slot.team === 1);

const CHARACTER: Character = {
  id: "char-1",
  name: "Mèo Mập",
  guildClass: GuildClass.THIET_Y,
} as Character;

/**
 * Render team 1 with the given people standing in its first slots.
 * @param people - How many slots to fill, from the first one
 * @returns Nothing
 */
function renderTeam(people: number) {
  const occupants = new Map(
    TEAM_ONE.slice(0, people).map((slot) => [slot.id, CHARACTER])
  );

  render(
    <DndContext>
      <TeamColumn
        team={1}
        name=""
        onNameChange={vi.fn()}
        slots={TEAM_ONE}
        occupants={occupants}
        absentIds={new Set()}
        notes={{}}
        onNoteChange={vi.fn()}
      />
    </DndContext>
  );
}

describe("TeamColumn — số người", () => {
  it("header đếm số ô đã có người trên tổng số ô", () => {
    renderTeam(4);

    expect(screen.getByText(`4/${TEAM_ONE.length}`)).toBeTruthy();
  });

  it("đội trống vẫn hiện 0", () => {
    renderTeam(0);

    expect(screen.getByText(`0/${TEAM_ONE.length}`)).toBeTruthy();
  });
});
