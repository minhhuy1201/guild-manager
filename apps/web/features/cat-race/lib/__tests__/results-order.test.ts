import { PrizeTier } from "@guild/shared/enums";
import { describe, expect, it } from "vitest";

import { PRIZE, ROUND } from "../../components/__tests__/fixtures";
import { prizesByTier, roundsOf } from "../results-order";

const prize = (id: string, tier: PrizeTier, sortOrder: number) => ({ ...PRIZE, id, tier, sortOrder });

describe("prizesByTier", () => {
  it("puts the most valuable tier first and keeps sortOrder inside a tier", () => {
    const ordered = prizesByTier([
      prize("low", PrizeTier.LOW, 0),
      prize("high-b", PrizeTier.HIGH, 2),
      prize("mid", PrizeTier.MEDIUM, 1),
      prize("high-a", PrizeTier.HIGH, 1),
    ]);

    expect(ordered.map((p) => p.id)).toEqual(["high-a", "high-b", "mid", "low"]);
  });

  it("does not mutate its input", () => {
    const input = [prize("low", PrizeTier.LOW, 0), prize("high", PrizeTier.HIGH, 1)];

    prizesByTier(input);

    expect(input.map((p) => p.id)).toEqual(["low", "high"]);
  });
});

describe("roundsOf", () => {
  it("returns a prize's rounds in draw order", () => {
    const rounds = [
      { ...ROUND, id: "late", drawnAt: "2026-10-12T02:00:00.000Z" },
      { ...ROUND, id: "other", prizeId: "p2" },
      { ...ROUND, id: "early", drawnAt: "2026-10-12T01:00:00.000Z" },
    ];

    expect(roundsOf(rounds, "p1").map((r) => r.id)).toEqual(["early", "late"]);
  });
});
