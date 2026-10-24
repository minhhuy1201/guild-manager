import { PrizeTier } from "@guild/shared/enums";
import type { FeaturedRacePrize } from "@guild/shared/schemas";

/** Prizes of one tier, in the order the API sent them. */
export interface PrizeTierGroup {
  tier: PrizeTier;
  prizes: FeaturedRacePrize[];
}

/** The most valuable tier comes first. */
const TIER_ORDER: readonly PrizeTier[] = [
  PrizeTier.HIGH,
  PrizeTier.MEDIUM,
  PrizeTier.LOW,
];

/**
 * Group a race's prizes under their tier, most valuable first. A tier with no prize is left out.
 * @param prizes - The race's prizes
 * @returns One group per tier that has a prize
 */
export function groupPrizesByTier(
  prizes: readonly FeaturedRacePrize[]
): PrizeTierGroup[] {
  return TIER_ORDER.flatMap((tier) => {
    const inTier = prizes.filter((prize) => prize.tier === tier);

    return inTier.length > 0 ? [{ tier, prizes: inTier }] : [];
  });
}
