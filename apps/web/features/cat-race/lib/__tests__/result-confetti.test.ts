import { describe, expect, it } from "vitest";
import { PrizeTier } from "@guild/shared/enums";

import { confettiPlan } from "../result-confetti";

describe("confettiPlan", () => {
  it("gives the top tier a centre burst and two side cannons after it", () => {
    const plan = confettiPlan(PrizeTier.HIGH);

    expect(plan.map((b) => b.options.particleCount)).toEqual([140, 90, 90]);
    expect(plan.map((b) => b.delayMs)).toEqual([0, 350, 350]);
    expect(plan.slice(1).map((b) => [b.options.angle, b.options.origin])).toEqual([
      [60, { x: 0, y: 0.75 }],
      [120, { x: 1, y: 0.75 }],
    ]);
  });

  it("gives the middle tier one full burst and the low tier a small one", () => {
    expect(confettiPlan(PrizeTier.MEDIUM).map((b) => b.options.particleCount)).toEqual([140]);
    expect(confettiPlan(PrizeTier.LOW).map((b) => b.options.particleCount)).toEqual([70]);
  });

  it("colours each tier differently", () => {
    const colorsOf = (tier: PrizeTier) => confettiPlan(tier)[0].options.colors;

    expect(colorsOf(PrizeTier.HIGH)).toEqual(["#e8b84a", "#fff1c1", "#c8372d"]);
    expect(colorsOf(PrizeTier.MEDIUM)).toEqual(["#4fae8c", "#bff0dc", "#f3e9d2"]);
    expect(colorsOf(PrizeTier.LOW)).toEqual(["#f3e9d2", "#b9ab90"]);
  });
});
