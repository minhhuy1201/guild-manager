import { FEATURED_RACE_LIMIT } from '@guild/shared/schemas';

import { FeaturedRaceService } from '../featured-race.service';
import { createPrisma, NOW } from './cat-race.fixtures';

function round(
  winnerName: string,
  drawnAt: string,
  voidedAt: Date | null = null,
) {
  return {
    winnerName,
    winnerGuildClass: 'CUU_LINH',
    drawnAt: new Date(drawnAt),
    voidedAt,
  };
}

function prizeRow(
  name: string,
  tier: 'HIGH' | 'MEDIUM' | 'LOW',
  sortOrder: number,
  rounds: ReturnType<typeof round>[],
) {
  return { name, tier, sortOrder, rounds };
}

function eventRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'e1',
    name: 'Đợt đua',
    endedAt: NOW,
    featuredAt: NOW,
    _count: { participants: 12 },
    prizes: [],
    ...overrides,
  };
}

function build(rows: unknown[]) {
  const prisma = createPrisma();
  prisma.catRaceEvent.findMany.mockResolvedValue(rows);

  return { prisma, service: new FeaturedRaceService(prisma as never) };
}

describe('FeaturedRaceService', () => {
  it('asks for the newest featured events, capped at the limit', async () => {
    const { prisma, service } = build([]);

    await service.list();

    expect(prisma.catRaceEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { featuredAt: { not: null }, endedAt: { not: null } },
        orderBy: { endedAt: 'desc' },
        take: FEATURED_RACE_LIMIT,
      }),
    );
    expect(FEATURED_RACE_LIMIT).toBe(3);
  });

  it('returns an empty list when nothing is featured', async () => {
    const { service } = build([]);

    await expect(service.list()).resolves.toEqual([]);
  });

  it('fails loud when a featured event has no endedAt', async () => {
    const { service } = build([eventRow({ id: 'broken', endedAt: null })]);

    await expect(service.list()).rejects.toThrow(
      'featured event broken has no endedAt',
    );
  });

  it('keeps the order the database returned', async () => {
    const { service } = build([
      eventRow({ id: 'new' }),
      eventRow({ id: 'old' }),
    ]);

    const races = await service.list();

    expect(races.map((race) => race.id)).toEqual(['new', 'old']);
  });

  it('drops voided rounds and the prize left with no winner', async () => {
    const { service } = build([
      eventRow({
        prizes: [
          prizeRow('Còn', 'HIGH', 0, [
            round('A', '2026-10-12T01:00:00Z'),
            round('B', '2026-10-12T02:00:00Z', NOW),
          ]),
          prizeRow('Huỷ hết', 'HIGH', 1, [
            round('C', '2026-10-12T01:00:00Z', NOW),
          ]),
          prizeRow('Chưa đua', 'LOW', 2, []),
        ],
      }),
    ]);

    const [race] = await service.list();

    expect(race.prizes).toEqual([
      {
        name: 'Còn',
        tier: 'HIGH',
        winners: [{ name: 'A', guildClass: 'CUU_LINH' }],
      },
    ]);
  });

  it('orders prizes by tier then sort order, and winners by draw time', async () => {
    const { service } = build([
      eventRow({
        prizes: [
          prizeRow('Thường', 'LOW', 0, [round('L', '2026-10-12T01:00:00Z')]),
          prizeRow('Lớn 2', 'MEDIUM', 3, [round('M2', '2026-10-12T01:00:00Z')]),
          prizeRow('Đặc biệt', 'HIGH', 5, [
            round('late', '2026-10-12T03:00:00Z'),
            round('early', '2026-10-12T01:00:00Z'),
          ]),
          prizeRow('Lớn 1', 'MEDIUM', 1, [round('M1', '2026-10-12T01:00:00Z')]),
        ],
      }),
    ]);

    const [race] = await service.list();

    expect(race.prizes.map((prize) => prize.name)).toEqual([
      'Đặc biệt',
      'Lớn 1',
      'Lớn 2',
      'Thường',
    ]);
    expect(race.prizes[0].winners.map((winner) => winner.name)).toEqual([
      'early',
      'late',
    ]);
  });

  it('exposes only the public shape: no tickets, Discord or character ids', async () => {
    const { service } = build([
      eventRow({
        prizes: [
          prizeRow('Giải', 'HIGH', 0, [round('A', '2026-10-12T01:00:00Z')]),
        ],
      }),
    ]);

    const [race] = await service.list();

    expect(race).toEqual({
      id: 'e1',
      name: 'Đợt đua',
      endedAt: NOW.toISOString(),
      participantCount: 12,
      prizes: [
        {
          name: 'Giải',
          tier: 'HIGH',
          winners: [{ name: 'A', guildClass: 'CUU_LINH' }],
        },
      ],
    });
    expect(JSON.stringify(race)).not.toMatch(/ticket|discord|characterId/i);
  });
});
