import { GuildClass, PrizeTier } from '@guild/shared/enums';
import {
  featuredRaceSchema,
  type FeaturedRace,
  type FeaturedRacePrize,
} from '@guild/shared/schemas';

import { verifyResponse } from '../../config';
import type { Prisma } from '../../generated/prisma/client';
import { isActiveRound } from './cat-race.codec';

/** What the landing page needs of one event; rounds carry `voidedAt` so voiding is decided here. */
export const FEATURED_RACE_INCLUDE = {
  _count: { select: { participants: true } },
  prizes: {
    select: {
      name: true,
      tier: true,
      sortOrder: true,
      rounds: {
        select: {
          winnerName: true,
          winnerGuildClass: true,
          drawnAt: true,
          voidedAt: true,
        },
      },
    },
  },
} satisfies Prisma.CatRaceEventInclude;

export type FeaturedRaceRow = Prisma.CatRaceEventGetPayload<{
  include: typeof FEATURED_RACE_INCLUDE;
}>;

/** Display order of the tiers: the most valuable prize first. */
const TIER_ORDER: readonly PrizeTier[] = [
  PrizeTier.HIGH,
  PrizeTier.MEDIUM,
  PrizeTier.LOW,
];

/**
 * Map an ended event to its public shape. A prize whose rounds are all voided is dropped, so the
 * landing page never lists a prize nobody holds.
 * @param row - The event loaded with `FEATURED_RACE_INCLUDE`
 * @param endedAt - The event's end, already known to be set
 * @returns The public shape: names and classes only
 */
export function toFeaturedRace(
  row: FeaturedRaceRow,
  endedAt: Date,
): FeaturedRace {
  const prizes = row.prizes
    .map((prize) => ({
      name: prize.name,
      tier: prize.tier as PrizeTier,
      sortOrder: prize.sortOrder,
      winners: prize.rounds
        .filter(isActiveRound)
        .sort((a, b) => a.drawnAt.getTime() - b.drawnAt.getTime())
        .map((round) => ({
          name: round.winnerName,
          guildClass: round.winnerGuildClass as GuildClass,
        })),
    }))
    .filter((prize) => prize.winners.length > 0)
    .sort(
      (a, b) =>
        TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) ||
        a.sortOrder - b.sortOrder,
    )
    .map(({ name, tier, winners }): FeaturedRacePrize => ({
      name,
      tier,
      winners,
    }));

  return verifyResponse(featuredRaceSchema, {
    id: row.id,
    name: row.name,
    endedAt: endedAt.toISOString(),
    participantCount: row._count.participants,
    prizes,
  } satisfies FeaturedRace);
}
