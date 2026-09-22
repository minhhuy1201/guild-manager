import { describe, expect, it } from "vitest";
import type { TacticStage, TacticToken } from "@guild/shared/schemas";

import {
  GHOST_OPACITY,
  easeOutCubic,
  frameToStage,
  pairTokens,
  staticFrame,
  transitionFrame,
} from "../lib/stage-transition";

/**
 * A token with the fields a test does not care about already filled in.
 * @param overrides - What this token differs by
 * @returns The token
 */
function token(overrides: Partial<TacticToken> & { id: string }): TacticToken {
  return {
    kind: "token",
    label: "Đội công",
    icon: "swords",
    x: 0,
    y: 0,
    size: "md",
    color: "red",
    ...overrides,
  };
}

/**
 * A stage holding the given elements.
 * @param id - Id of the stage
 * @param elements - What stands on it
 * @returns The stage
 */
function stage(id: string, elements: TacticStage["elements"]): TacticStage {
  return { id, name: `Giai đoạn ${id}`, elements };
}

describe("easeOutCubic", () => {
  it("pins both ends and leaves the middle past halfway", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });
});

describe("pairTokens", () => {
  it("pairs by id before anything else", () => {
    const from = stage("s1", [token({ id: "a", x: 0 })]);
    const to = stage("s2", [token({ id: "a", x: 100 })]);

    const { moved, entering, leaving } = pairTokens(from, to);

    expect(moved).toHaveLength(1);
    expect(moved[0].to.x).toBe(100);
    expect(entering).toEqual([]);
    expect(leaving).toEqual([]);
  });

  it("falls back to label and icon when the ids do not line up", () => {
    const from = stage("s1", [token({ id: "old", label: "Đội 3", x: 0 })]);
    const to = stage("s2", [token({ id: "new", label: "Đội 3", x: 50 })]);

    const { moved, entering, leaving } = pairTokens(from, to);

    expect(moved).toHaveLength(1);
    expect(moved[0].from.id).toBe("old");
    expect(moved[0].to.id).toBe("new");
    expect(entering).toEqual([]);
    expect(leaving).toEqual([]);
  });

  it("compares labels without their case or surrounding spaces", () => {
    const from = stage("s1", [token({ id: "old", label: " Đội 3 " })]);
    const to = stage("s2", [token({ id: "new", label: "đội 3" })]);

    expect(pairTokens(from, to).moved).toHaveLength(1);
  });

  it("does not pair two tokens that only share a label", () => {
    const from = stage("s1", [token({ id: "old", label: "Đội 3", icon: "swords" })]);
    const to = stage("s2", [token({ id: "new", label: "Đội 3", icon: "shield" })]);

    const { moved, entering, leaving } = pairTokens(from, to);

    expect(moved).toEqual([]);
    expect(entering.map((unit) => unit.id)).toEqual(["new"]);
    expect(leaving.map((unit) => unit.id)).toEqual(["old"]);
  });

  it("does not let one token on the left eat two on the right", () => {
    const from = stage("s1", [token({ id: "old", label: "Đội 3" })]);
    const to = stage("s2", [
      token({ id: "n1", label: "Đội 3" }),
      token({ id: "n2", label: "Đội 3" }),
    ]);

    const { moved, entering } = pairTokens(from, to);

    expect(moved).toHaveLength(1);
    expect(entering.map((unit) => unit.id)).toEqual(["n2"]);
  });

  it("reports a token that only stands on one side", () => {
    const from = stage("s1", [token({ id: "gone", label: "Đội 1" })]);
    const to = stage("s2", [token({ id: "fresh", label: "Đội 2" })]);

    const { moved, entering, leaving } = pairTokens(from, to);

    expect(moved).toEqual([]);
    expect(entering.map((unit) => unit.id)).toEqual(["fresh"]);
    expect(leaving.map((unit) => unit.id)).toEqual(["gone"]);
  });

  it("ignores everything that is not a token", () => {
    const from = stage("s1", [
      {
        kind: "arrow",
        id: "ar1",
        points: [0, 0, 1, 1],
        color: "red",
        strokeWidth: 4,
      },
    ]);

    expect(pairTokens(from, stage("s2", []))).toEqual({
      moved: [],
      entering: [],
      leaving: [],
    });
  });
});

describe("transitionFrame", () => {
  const from = stage("s1", [
    token({ id: "a", x: 0, y: 0 }),
    token({ id: "gone", label: "Rút lui", x: 10, y: 10 }),
    {
      kind: "text",
      id: "t1",
      x: 0,
      y: 0,
      text: "cũ",
      color: "red",
      fontSize: 24,
    },
  ]);
  const to = stage("s2", [
    token({ id: "a", x: 100, y: 200 }),
    token({ id: "fresh", label: "Tiếp viện", x: 5, y: 5 }),
    {
      kind: "text",
      id: "t2",
      x: 0,
      y: 0,
      text: "mới",
      color: "red",
      fontSize: 24,
    },
  ]);

  it("puts a paired token at its start when t is 0", () => {
    const moved = transitionFrame(from, to, 0).tokens.find(
      (unit) => unit.token.id === "a"
    );

    expect(moved?.token.x).toBe(0);
    expect(moved?.token.y).toBe(0);
  });

  it("interpolates a paired token linearly", () => {
    const moved = transitionFrame(from, to, 0.5).tokens.find(
      (unit) => unit.token.id === "a"
    );

    expect(moved?.token.x).toBe(50);
    expect(moved?.token.y).toBe(100);
    expect(moved?.trail).toEqual([0, 0, 50, 100]);
  });

  it("lands a paired token on its target, carrying the target's own look", () => {
    const recoloured = stage("s2", [token({ id: "a", x: 100, color: "blue" })]);
    const moved = transitionFrame(from, recoloured, 1).tokens.find(
      (unit) => unit.token.id === "a"
    );

    expect(moved?.token.x).toBe(100);
    expect(moved?.token.color).toBe("blue");
  });

  it("fades a leaving token out and an entering token in", () => {
    const { tokens } = transitionFrame(from, to, 0.25);

    expect(tokens.find((unit) => unit.token.id === "gone")?.opacity).toBe(0.75);
    expect(tokens.find((unit) => unit.token.id === "fresh")?.opacity).toBe(0.25);
  });

  it("crossfades the drawings and leaves the tokens out of them", () => {
    const frame = transitionFrame(from, to, 0.25);

    expect(frame.outgoing.elements.map((element) => element.id)).toEqual(["t1"]);
    expect(frame.outgoing.opacity).toBe(0.75);
    expect(frame.incoming.elements.map((element) => element.id)).toEqual(["t2"]);
    expect(frame.incoming.opacity).toBe(0.25);
  });

  it("runs the same move backwards when the two stages are swapped", () => {
    const forward = transitionFrame(from, to, 0.25).tokens.find(
      (unit) => unit.token.id === "a"
    );
    const backward = transitionFrame(to, from, 0.75).tokens.find(
      (unit) => unit.token.id === "a"
    );

    expect(backward?.token.x).toBe(forward?.token.x);
    expect(backward?.token.y).toBe(forward?.token.y);
  });

  it("draws no trail before the move has started", () => {
    expect(
      transitionFrame(from, to, 0).tokens.find((unit) => unit.token.id === "a")
        ?.trail
    ).toBeNull();
  });

  it("draws no trail for a token that stands still", () => {
    const still = stage("s2", [token({ id: "a", x: 0, y: 0 })]);

    expect(
      transitionFrame(from, still, 0.5).tokens.find(
        (unit) => unit.token.id === "a"
      )?.trail
    ).toBeNull();
  });

  it("shows no onion skin while the move runs", () => {
    expect(transitionFrame(from, to, 0.5).ghosts).toEqual([]);
  });
});

describe("staticFrame", () => {
  const only = stage("s1", [
    token({ id: "a", x: 1 }),
    {
      kind: "text",
      id: "t1",
      x: 0,
      y: 0,
      text: "ghi chú",
      color: "red",
      fontSize: 24,
    },
  ]);

  it("holds nothing outgoing and shows everything solid", () => {
    const frame = staticFrame(only);

    expect(frame.outgoing.elements).toEqual([]);
    expect(frame.incoming.opacity).toBe(1);
    expect(frame.tokens.every((unit) => unit.opacity === 1)).toBe(true);
    expect(frame.tokens.every((unit) => unit.trail === null)).toBe(true);
  });

  it("has no ghosts without a stage to ghost", () => {
    expect(staticFrame(only).ghosts).toEqual([]);
    expect(staticFrame(only, null).ghosts).toEqual([]);
  });

  it("ghosts the tokens of the stage before it", () => {
    const previous = stage("s0", [token({ id: "a", x: 900 })]);
    const { ghosts } = staticFrame(only, previous);

    expect(ghosts).toHaveLength(1);
    expect(ghosts[0].token.x).toBe(900);
    expect(ghosts[0].opacity).toBe(GHOST_OPACITY);
  });
});

describe("frameToStage", () => {
  it("freezes a running frame into a stage the next move can start from", () => {
    const from = stage("s1", [token({ id: "a", x: 0 })]);
    const to = stage("s2", [
      token({ id: "a", x: 100 }),
      {
        kind: "text",
        id: "t2",
        x: 0,
        y: 0,
        text: "mới",
        color: "red",
        fontSize: 24,
      },
    ]);
    const frozen = frameToStage(transitionFrame(from, to, 0.5), to);

    expect(frozen.id).toBe("s2");
    expect(frozen.elements.map((element) => element.id)).toEqual(["t2", "a"]);
    expect(frozen.elements.find((element) => element.id === "a")).toMatchObject({
      x: 50,
    });
  });
});
