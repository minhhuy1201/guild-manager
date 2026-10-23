import { PrizeTier } from "@guild/shared/enums";
import type { CatRacePrize, CatRaceRound } from "@guild/shared/schemas";

const TIER_RANK: Record<PrizeTier, number> = {
  [PrizeTier.HIGH]: 0,
  [PrizeTier.MEDIUM]: 1,
  [PrizeTier.LOW]: 2,
};

/**
 * Prizes as the results view lists them: the most valuable tier first, the host's own order inside
 * a tier.
 * @param prizes - The event's prizes
 * @returns A new, sorted array
 */
export function prizesByTier(prizes: CatRacePrize[]): CatRacePrize[] {
  return [...prizes].sort(
    (a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier] || a.sortOrder - b.sortOrder
  );
}

/**
 * One prize's rounds in the order they were drawn.
 * @param rounds - Every round of the event
 * @param prizeId - The prize
 * @returns A new array, oldest draw first
 */
export function roundsOf(rounds: CatRaceRound[], prizeId: string): CatRaceRound[] {
  return rounds
    .filter((round) => round.prizeId === prizeId)
    .sort((a, b) => a.drawnAt.localeCompare(b.drawnAt));
}
