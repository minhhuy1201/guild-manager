// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SLOTS_PER_TEAM, TEAM_COUNT } from "../../lib/mock-formation";
import { TeamSwitcher } from "../team-switcher";

afterEach(cleanup);

/** Ten teams: the first named "MID" with four members placed, the rest unnamed and empty. */
const TEAMS = Array.from({ length: TEAM_COUNT }, (_, index) => ({
  team: index + 1,
  label: index === 0 ? "MID" : String(index + 1),
  filled: index === 0 ? 4 : 0,
}));

/**
 * Render the switcher with team 2 picked.
 * @returns The selection spy
 */
function renderSwitcher() {
  const onSelect = vi.fn();
  render(
    <TeamSwitcher
      teams={TEAMS}
      slotsPerTeam={SLOTS_PER_TEAM}
      selectedTeam={2}
      onSelect={onSelect}
    />
  );
  return onSelect;
}

// Trên điện thoại chỉ hiện một team mỗi lúc, nên lưới chip là cách đổi team và cũng cho thấy team nào
// đã đủ người mà không phải mở từng team.
describe("TeamSwitcher", () => {
  it("hiện đủ 10 chip, mỗi chip có tên và số ô đã xếp trên 6", () => {
    renderSwitcher();

    expect(screen.getAllByRole("button")).toHaveLength(TEAM_COUNT);
    expect(screen.getByRole("button", { name: /MID/ }).textContent).toContain(
      `4/${SLOTS_PER_TEAM}`
    );
  });

  it("chip đang chọn mang aria-pressed=true, các chip khác false", () => {
    renderSwitcher();

    const pressed = screen
      .getAllByRole("button")
      .map((chip) => chip.getAttribute("aria-pressed"));

    expect(pressed[1]).toBe("true");
    expect(pressed.filter((value) => value === "true")).toHaveLength(1);
    expect(pressed.filter((value) => value === "false")).toHaveLength(
      TEAM_COUNT - 1
    );
  });

  it("bấm chip thì gọi onSelect với số team", () => {
    const onSelect = renderSwitcher();

    fireEvent.click(screen.getAllByRole("button")[2]);

    expect(onSelect).toHaveBeenCalledWith(3);
  });
});
