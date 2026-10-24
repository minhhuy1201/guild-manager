import { PrizeTier } from "@guild/shared/enums";
import { describe, expect, it } from "vitest";

import { groupPrizesByTier } from "../group-prizes-by-tier";

const prize = (name: string, tier: PrizeTier) => ({ name, tier, winners: [] });

describe("groupPrizesByTier", () => {
  it("puts HIGH first and keeps the incoming order inside a tier", () => {
    const groups = groupPrizesByTier([
      prize("low", PrizeTier.LOW),
      prize("high 1", PrizeTier.HIGH),
      prize("high 2", PrizeTier.HIGH),
    ]);

    expect(groups.map((group) => group.tier)).toEqual([
      PrizeTier.HIGH,
      PrizeTier.LOW,
    ]);
    expect(groups[0].prizes.map((p) => p.name)).toEqual(["high 1", "high 2"]);
  });

  it("returns nothing for no prize", () => {
    expect(groupPrizesByTier([])).toEqual([]);
  });
});
