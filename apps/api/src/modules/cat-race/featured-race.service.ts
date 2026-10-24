import { Injectable } from '@nestjs/common';
import { FEATURED_RACE_LIMIT, type FeaturedRace } from '@guild/shared/schemas';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { FEATURED_RACE_INCLUDE, toFeaturedRace } from './featured-race.codec';

/** What a visitor without a session may read of the cat race: the Featured races, results only. */
@Injectable()
export class FeaturedRaceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The newest Featured races.
   * @returns Up to `FEATURED_RACE_LIMIT` ended events, newest end first
   */
  async list(): Promise<FeaturedRace[]> {
    const rows = await this.prisma.catRaceEvent.findMany({
      // A featured event is always ended; the second condition narrows `endedAt` for the types.
      where: { featuredAt: { not: null }, endedAt: { not: null } },
      orderBy: { endedAt: 'desc' },
      take: FEATURED_RACE_LIMIT,
      include: FEATURED_RACE_INCLUDE,
    });

    return rows.flatMap((row) =>
      row.endedAt ? [toFeaturedRace(row, row.endedAt)] : [],
    );
  }
}
