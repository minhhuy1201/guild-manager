import { CatRaceMode, GuildClass, PrizeTier } from '@guild/shared/enums';
import {
  catRaceEventDetailSchema,
  catRaceEventSummarySchema,
  catRacePrizeTemplateSchema,
  type CatRaceEventDetail,
  type CatRaceEventSummary,
  type CatRacePrizeTemplate,
  type CatRaceRound,
} from '@guild/shared/schemas';

import { verifyResponse } from '../../config';
import type { Prisma } from '../../generated/prisma/client';

/** What the detail screen needs from one event, in one query. */
export const EVENT_DETAIL_INCLUDE = {
  participants: {
    include: { character: true },
    orderBy: { character: { name: 'asc' } },
  },
  prizes: {
    orderBy: { sortOrder: 'asc' },
    include: { entrants: true, rounds: { orderBy: { drawnAt: 'asc' } } },
  },
} satisfies Prisma.CatRaceEventInclude;

/** What the list needs: just enough of each prize to count the awarded rounds. */
export const EVENT_SUMMARY_INCLUDE = {
  prizes: { select: { rounds: { select: { voidedAt: true } } } },
} satisfies Prisma.CatRaceEventInclude;

export type EventDetailRow = Prisma.CatRaceEventGetPayload<{
  include: typeof EVENT_DETAIL_INCLUDE;
}>;
export type EventSummaryRow = Prisma.CatRaceEventGetPayload<{
  include: typeof EVENT_SUMMARY_INCLUDE;
}>;
export type RoundRow = EventDetailRow['prizes'][number]['rounds'][number];

/**
 * A round that still counts: not voided.
 * @param round - Anything with a `voidedAt`
 * @returns True when the round is in force
 */
export function isActiveRound(round: { voidedAt: Date | null }): boolean {
  return round.voidedAt === null;
}

/**
 * Map one round row to its shared shape.
 * @param row - The Prisma row
 * @returns The round as the web app reads it
 */
export function toRound(row: RoundRow): CatRaceRound {
  return {
    id: row.id,
    prizeId: row.prizeId,
    winnerCharacterId: row.winnerCharacterId,
    winnerName: row.winnerName,
    winnerGuildClass: row.winnerGuildClass as GuildClass,
    winnerTickets: row.winnerTickets,
    entrantCount: row.entrantCount,
    totalTickets: row.totalTickets,
    drawnAt: row.drawnAt.toISOString(),
    voidedAt: row.voidedAt?.toISOString() ?? null,
    voidReason: row.voidReason,
  };
}

/**
 * Map an event row to a list line.
 * @param row - The event with each prize's rounds
 * @returns The summary shape
 */
export function toEventSummary(row: EventSummaryRow): CatRaceEventSummary {
  const awardedCount = row.prizes
    .flatMap((prize) => prize.rounds)
    .filter(isActiveRound).length;

  return verifyResponse(catRaceEventSummarySchema, {
    id: row.id,
    name: row.name,
    mode: row.mode as CatRaceMode,
    status: row.endedAt ? 'ENDED' : 'OPEN',
    createdAt: row.createdAt.toISOString(),
    discordPostedAt: row.discordPostedAt?.toISOString() ?? null,
    awardedCount,
  } satisfies CatRaceEventSummary);
}

/**
 * Map an event row with its roster, prizes and rounds to the detail shape.
 * @param row - The event loaded with `EVENT_DETAIL_INCLUDE`
 * @returns The detail shape
 */
export function toEventDetail(row: EventDetailRow): CatRaceEventDetail {
  const rounds = row.prizes.flatMap((prize) => prize.rounds);

  return verifyResponse(catRaceEventDetailSchema, {
    ...toEventSummary({
      ...row,
      prizes: row.prizes.map(({ rounds: prizeRounds }) => ({
        rounds: prizeRounds,
      })),
    }),
    participants: row.participants.map((participant) => ({
      characterId: participant.characterId,
      name: participant.character.name,
      guildClass: participant.character.guildClass as GuildClass,
      discordId: participant.character.discordId,
      discordAvatar: participant.character.discordAvatar,
      tickets: participant.tickets,
    })),
    prizes: row.prizes.map((prize) => ({
      id: prize.id,
      name: prize.name,
      quantity: prize.quantity,
      tier: prize.tier as PrizeTier,
      sortOrder: prize.sortOrder,
      awardedCount: prize.rounds.filter(isActiveRound).length,
      entrantIds: prize.entrants.map((entrant) => entrant.characterId),
    })),
    rounds: rounds
      .slice()
      .sort((a, b) => a.drawnAt.getTime() - b.drawnAt.getTime())
      .map(toRound),
  } satisfies CatRaceEventDetail);
}

/**
 * Map a prize row to the line a new event starts from.
 * @param row - Name, quantity and tier of a stored prize
 * @returns The template shape
 */
export function toPrizeTemplate(row: {
  name: string;
  quantity: number;
  tier: string;
}): CatRacePrizeTemplate {
  return verifyResponse(catRacePrizeTemplateSchema, {
    name: row.name,
    quantity: row.quantity,
    tier: row.tier as PrizeTier,
  } satisfies CatRacePrizeTemplate);
}
