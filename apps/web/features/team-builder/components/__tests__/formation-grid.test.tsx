// @vitest-environment jsdom
import { DndContext } from "@dnd-kit/core";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TEAM_COUNT } from "../../lib/mock-formation";
import { useTeamViewStore } from "../../store/team-view-store";

// The banner title reads the attendance barrel, which carries `server-only`; no action runs here.
vi.mock("server-only", () => ({}));

const { FormationGrid } = await import("../formation-grid");

afterEach(cleanup);

beforeEach(() => {
  useTeamViewStore.setState({ selectedTeam: 2 });
});

/**
 * Render an empty grid in one of its two layouts.
 * @param layout - "screen" for the page, "capture" for the image sent to Discord
 * @returns The rendered container
 */
function renderGrid(layout: "screen" | "capture") {
  return render(
    <DndContext>
      <FormationGrid
        bannerTitle="BANG CHIẾN 20:00 19/09"
        isGuildWar
        locked={false}
        assignment={{}}
        notes={{}}
        onNoteChange={() => {}}
        names={{}}
        onNameChange={() => {}}
        charactersById={new Map()}
        absentIds={new Set()}
        layout={layout}
      />
    </DndContext>
  );
}

/**
 * The card of one team, found through its name header.
 * @param team - Team number
 * @returns The team's card element
 */
function teamCard(team: number): HTMLElement {
  return screen
    .getByRole("button", { name: new RegExp(`^Đội ${team}\\.`) })
    .closest("[data-slot=card]") as HTMLElement;
}

// Dưới md mười team xếp một cột làm trang dài gần 6.000px: trên điện thoại chỉ hiện team đang chọn.
describe("FormationGrid - mỗi lúc một team dưới md", () => {
  it("layout screen ẩn dưới md mọi team trừ team đang chọn, và có 10 chip", () => {
    const { container } = renderGrid("screen");

    expect(teamCard(2).className).not.toContain("max-md:hidden");
    expect(teamCard(1).className).toContain("max-md:hidden");
    expect(teamCard(TEAM_COUNT).className).toContain("max-md:hidden");
    expect(container.querySelectorAll("button[aria-pressed]")).toHaveLength(
      TEAM_COUNT
    );
  });

  // Ảnh gửi Discord luôn đủ mười team, trên mọi màn hình.
  it("layout capture không ẩn team nào và không có chip", () => {
    const { container } = renderGrid("capture");

    for (let team = 1; team <= TEAM_COUNT; team += 1) {
      expect(teamCard(team).className).not.toContain("max-md:hidden");
    }
    expect(container.querySelectorAll("button[aria-pressed]")).toHaveLength(0);
  });
});
