// @vitest-environment jsdom
import { DndContext } from "@dnd-kit/core";
import { TEAM_COUNT } from "@guild/shared/lib";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useTeamViewStore } from "../../store/team-view-store";

// The banner title reads the attendance barrel, which carries `server-only`; no action runs here.
vi.mock("server-only", () => ({}));

const { FormationGrid } = await import("../formation-grid");

afterEach(cleanup);

beforeEach(() => {
  useTeamViewStore.setState({ selectedTeam: 2 });
});

/**
 * Render an empty grid in one of its layouts.
 * @param layout - "screen" for the page, "capture" for the image sent to Discord, "focus" for the fullscreen mode
 * @returns The rendered container
 */
function renderGrid(layout: "screen" | "capture" | "focus") {
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

// Below md, ten teams in one column make the page nearly 6,000px long: on a phone only the
// selected team is shown.
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

  // The image sent to Discord always carries all ten teams, on every screen size.
  it("layout capture không ẩn team nào và không có chip", () => {
    const { container } = renderGrid("capture");

    for (let team = 1; team <= TEAM_COUNT; team += 1) {
      expect(teamCard(team).className).not.toContain("max-md:hidden");
    }
    expect(container.querySelectorAll("button[aria-pressed]")).toHaveLength(0);
  });
});

describe("FormationGrid - layout focus", () => {
  it("hiện cả hai hàng đội với nhãn và số đã xếp, không có nút gập", () => {
    renderGrid("focus");

    expect(screen.getByText("Đội 1-5")).toBeTruthy();
    expect(screen.getByText("Đội 6-10")).toBeTruthy();
    expect(screen.getAllByText("0/30")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /^Đội 1-5/ })).toBeNull();
    expect(teamCard(1)).toBeTruthy();
    expect(teamCard(TEAM_COUNT)).toBeTruthy();
  });

  it("không dựng banner vì thanh trên đã nêu tên trận", () => {
    renderGrid("focus");

    expect(screen.queryByText("BANG CHIẾN 20:00 19/09")).toBeNull();
  });

  it("layout screen vẫn gập được hàng đội", () => {
    renderGrid("screen");

    expect(screen.getByRole("button", { name: /^Đội 1-5/ })).toBeTruthy();
  });
});
