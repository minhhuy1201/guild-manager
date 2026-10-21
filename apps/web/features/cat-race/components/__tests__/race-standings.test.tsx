// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GuildClass } from "@guild/shared/enums";
import type { CatRaceParticipant } from "@guild/shared/schemas";

const { reducedMotion } = vi.hoisted(() => ({ reducedMotion: { current: false } }));
vi.mock("@/hooks/use-reduced-motion", () => ({ useReducedMotion: () => reducedMotion.current }));

import { advanceBoard, EMPTY_BOARD, type BoardState } from "../../lib/race-board";
import { buildRaceScript } from "../../lib/race-script";
import { RaceStandings } from "../race-standings";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const IDS = ["a", "b", "c", "d"];
const PARTICIPANTS: CatRaceParticipant[] = IDS.map((id) => ({
  characterId: id,
  name: id,
  guildClass: GuildClass.TO_VAN,
  discordId: null,
  discordAvatar: null,
  tickets: 1,
}));
const SCRIPT = buildRaceScript({
  entrants: IDS.map((characterId) => ({ characterId, tickets: 1 })),
  winner: { characterId: "a", ticketNo: 1 },
  durationSeconds: 12,
  random: () => 0.5,
});

/** A board whose gaps are 0, 1.2, 2.4, ... down the given keys. */
function boardOf(keys: string[], previous: BoardState = EMPTY_BOARD): BoardState {
  return advanceBoard(
    previous,
    keys.map((key, index) => ({ key: `${key}#1`, lengthsBehind: index * 1.2 }))
  );
}

/** Lay rows out 40px apart in DOM order, which jsdom does not do. */
function layOutRows() {
  Object.defineProperty(HTMLElement.prototype, "offsetTop", {
    configurable: true,
    get(this: HTMLElement) {
      return this.tagName === "LI" ? [...this.parentElement!.children].indexOf(this) * 40 : 0;
    },
  });
}

beforeEach(() => {
  reducedMotion.current = false;
  layOutRows();
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 0);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderBoard(board: BoardState) {
  return render(<RaceStandings script={SCRIPT} participants={PARTICIPANTS} board={board} />);
}

describe("RaceStandings", () => {
  it("says the board comes with the race before there is a script", () => {
    render(<RaceStandings script={null} participants={PARTICIPANTS} board={EMPTY_BOARD} />);

    expect(screen.getByText("Bảng xếp hạng hiện khi bắt đầu đua.")).toBeTruthy();
  });

  it("shows the header with the cat count and gaps with a minus, one decimal and a comma", () => {
    renderBoard(boardOf(["a", "b", "c"]));

    expect(screen.getByText("BẢNG XẾP HẠNG").textContent).toContain("4 mèo");
    const gaps = [...document.querySelectorAll(".race-gap")].map((cell) => cell.textContent);
    expect(gaps).toEqual(["", "-1,2", "-2,4"]);
  });

  it("marks the top three as gold, silver and bronze and warms the leader's row", () => {
    renderBoard(boardOf(["a", "b", "c", "d"]));

    const medals = [...document.querySelectorAll(".race-rank")].map((cell) => cell.getAttribute("data-medal"));
    expect(medals).toEqual(["gold", "silver", "bronze", null]);
    const rows = screen.getAllByRole("listitem");
    expect(rows.map((row) => row.getAttribute("data-lead"))).toEqual(["true", "false", "false", "false"]);
  });

  it("arrows up for a climber and down for a faller against the previous update", () => {
    const first = boardOf(["a", "b", "c"]);
    renderBoard(boardOf(["c", "a", "b"], first));

    const moves = [...document.querySelectorAll(".race-move")].map((cell) => cell.getAttribute("data-move"));
    expect(moves).toEqual(["up", "down", "down"]);
    expect(screen.getAllByRole("listitem")[0]?.textContent).toContain("▲");
    expect(screen.getAllByRole("listitem")[1]?.textContent).toContain("▼");
  });

  it("slides a row that changed place with a transform only, from where it stood", () => {
    const { rerender } = renderBoard(boardOf(["a", "b", "c"]));
    const rowOf = (name: string) => screen.getByText(name).closest("li") as HTMLElement;

    rerender(
      <RaceStandings
        script={SCRIPT}
        participants={PARTICIPANTS}
        board={boardOf(["c", "a", "b"], boardOf(["a", "b", "c"]))}
      />
    );

    expect(rowOf("c").style.transform).toBe("translateY(80px)");
    expect(rowOf("a").style.transform).toBe("translateY(-40px)");
  });

  it("does not slide under reduced motion", () => {
    reducedMotion.current = true;
    const { rerender } = renderBoard(boardOf(["a", "b", "c"]));

    rerender(
      <RaceStandings
        script={SCRIPT}
        participants={PARTICIPANTS}
        board={boardOf(["c", "a", "b"], boardOf(["a", "b", "c"]))}
      />
    );

    for (const row of screen.getAllByRole("listitem")) {
      expect(row.style.transform).toBe("");
    }
  });
});
