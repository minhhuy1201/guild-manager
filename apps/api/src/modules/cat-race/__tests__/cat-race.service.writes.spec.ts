import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { cryptoRandomInt } from '../cat-race.service';
import {
  buildService,
  createPrisma,
  NOW,
  openEvent,
} from './cat-race.fixtures';

/** A prisma double whose event lookup finds an open event, so `lockOpenEvent` passes. */
function openPrisma() {
  const prisma = createPrisma();
  prisma.catRaceEvent.findUnique.mockResolvedValue(openEvent());

  return prisma;
}

describe('CatRaceService reads', () => {
  it('lists events newest first', async () => {
    const prisma = createPrisma();
    prisma.catRaceEvent.findMany.mockResolvedValue([openEvent()]);

    const list = await buildService(prisma).list();

    expect(list).toHaveLength(1);
    expect(prisma.catRaceEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
    );
  });

  it('prefills from the latest event, and from nothing before the first', async () => {
    const prisma = createPrisma();
    prisma.catRaceEvent.findFirst.mockResolvedValueOnce({
      prizes: [{ name: 'Vé', quantity: 2, tier: 'LOW' }],
    });
    prisma.catRaceEvent.findFirst.mockResolvedValueOnce(null);
    const service = buildService(prisma);

    expect(await service.prefill()).toEqual([
      { name: 'Vé', quantity: 2, tier: 'LOW' },
    ]);
    expect(await service.prefill()).toEqual([]);
  });

  it('returns one event, and 404s an unknown id', async () => {
    const prisma = createPrisma();
    prisma.catRaceEvent.findUnique.mockResolvedValueOnce(openEvent());
    prisma.catRaceEvent.findUnique.mockResolvedValueOnce(null);
    const service = buildService(prisma);

    expect((await service.detail('e1')).id).toBe('e1');
    await expect(service.detail('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('404s a write on an unknown event', async () => {
    const prisma = createPrisma();
    prisma.catRaceEvent.findUnique.mockResolvedValue(null);

    await expect(
      buildService(prisma).update('nope', { name: 'x' }),
    ).rejects.toThrow('Không tìm thấy đợt quay.');
  });
});

describe('CatRaceService event writes', () => {
  it('renames without touching the mode checks', async () => {
    const prisma = openPrisma();

    await buildService(prisma).update('e1', { name: 'Mới' });

    expect(prisma.catRaceRound.count).not.toHaveBeenCalled();
    expect(prisma.catRaceEvent.update).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: { name: 'Mới', mode: undefined },
    });
  });

  it('switches to TICKET without resetting tickets', async () => {
    const prisma = createPrisma();
    prisma.catRaceEvent.findUnique.mockResolvedValue(
      openEvent({ mode: 'STANDARD' }),
    );
    prisma.catRaceRound.count.mockResolvedValue(0);

    await buildService(prisma).update('e1', { mode: 'TICKET' as never });

    expect(prisma.catRaceParticipant.updateMany).not.toHaveBeenCalled();
  });

  it('rejects a roster with a repeated member', async () => {
    const prisma = openPrisma();

    await expect(
      buildService(prisma).create(
        {
          mode: 'TICKET' as never,
          participants: [
            { characterId: 'a', tickets: 1 },
            { characterId: 'a', tickets: 2 },
          ],
          prizes: [],
        },
        'admin',
      ),
    ).rejects.toThrow('Danh sách có người trùng nhau.');
  });

  it('deletes an event with no round', async () => {
    const prisma = openPrisma();
    prisma.catRaceRound.count.mockResolvedValue(0);

    await buildService(prisma).remove('e1');

    expect(prisma.catRaceEvent.delete).toHaveBeenCalledWith({
      where: { id: 'e1' },
    });
  });
});

describe('CatRaceService prize writes', () => {
  it('adds a prize at the end, with the whole roster as entrants', async () => {
    const prisma = openPrisma();
    prisma.catRacePrize.count.mockResolvedValue(2);
    prisma.catRacePrize.create.mockResolvedValue({ id: 'p9' });
    prisma.catRaceParticipant.findMany.mockResolvedValue([
      { characterId: 'a' },
      { characterId: 'b' },
    ]);

    await buildService(prisma).addPrize('e1', {
      name: 'Vé',
      quantity: 1,
      tier: 'LOW' as never,
    });

    expect(prisma.catRacePrize.create).toHaveBeenCalledWith({
      data: {
        name: 'Vé',
        quantity: 1,
        tier: 'LOW',
        eventId: 'e1',
        sortOrder: 2,
      },
    });
    expect(prisma.catRaceEntrant.createMany).toHaveBeenCalledWith({
      data: [
        { prizeId: 'p9', characterId: 'a' },
        { prizeId: 'p9', characterId: 'b' },
      ],
    });
  });

  it('edits a prize, and a quantity equal to the wins is allowed', async () => {
    const prisma = openPrisma();
    prisma.catRacePrize.findFirst.mockResolvedValue({ id: 'p1' });
    prisma.catRaceRound.count.mockResolvedValue(2);

    await buildService(prisma).updatePrize('e1', 'p1', { quantity: 2 });

    expect(prisma.catRacePrize.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { quantity: 2 },
    });
  });

  it('edits a prize without a quantity without counting rounds', async () => {
    const prisma = openPrisma();
    prisma.catRacePrize.findFirst.mockResolvedValue({ id: 'p1' });

    await buildService(prisma).updatePrize('e1', 'p1', { name: 'Mới' });

    expect(prisma.catRaceRound.count).not.toHaveBeenCalled();
  });

  it('404s a prize of another event', async () => {
    const prisma = openPrisma();
    prisma.catRacePrize.findFirst.mockResolvedValue(null);

    await expect(
      buildService(prisma).updatePrize('e1', 'other', { name: 'x' }),
    ).rejects.toThrow('Không tìm thấy hạng mục.');
  });

  it('deletes a prize with no round', async () => {
    const prisma = openPrisma();
    prisma.catRacePrize.findFirst.mockResolvedValue({ id: 'p1' });
    prisma.catRaceRound.count.mockResolvedValue(0);

    await buildService(prisma).removePrize('e1', 'p1');

    expect(prisma.catRacePrize.delete).toHaveBeenCalledWith({
      where: { id: 'p1' },
    });
  });

  it('replaces the entrants, dropping repeats', async () => {
    const prisma = openPrisma();
    prisma.catRacePrize.findFirst.mockResolvedValue({ id: 'p1' });
    prisma.catRaceParticipant.findMany.mockResolvedValue([
      { characterId: 'a' },
      { characterId: 'b' },
    ]);

    await buildService(prisma).setEntrants('e1', 'p1', {
      characterIds: ['a', 'a', 'b'],
    });

    expect(prisma.catRaceEntrant.deleteMany).toHaveBeenCalledWith({
      where: { prizeId: 'p1' },
    });
    expect(prisma.catRaceEntrant.createMany).toHaveBeenCalledWith({
      data: [
        { prizeId: 'p1', characterId: 'a' },
        { prizeId: 'p1', characterId: 'b' },
      ],
    });
  });
});

describe('CatRaceService draw and void guards', () => {
  it('fails loud if the drawn winner is not among the holders', async () => {
    const prisma = openPrisma();
    prisma.catRacePrize.findFirst.mockResolvedValue({ id: 'p1', quantity: 1 });
    prisma.catRaceRound.count.mockResolvedValue(0);
    prisma.catRaceEntrant.findMany.mockResolvedValue([
      { characterId: 'a' },
      { characterId: 'b' },
    ]);
    prisma.catRaceParticipant.findMany.mockResolvedValue([
      { characterId: 'a', tickets: 1 },
      { characterId: 'b', tickets: 1 },
    ]);
    prisma.character.findUniqueOrThrow.mockResolvedValue({
      id: 'ghost',
      name: 'Ma',
      guildClass: 'TO_VAN',
    });

    await expect(
      buildService(prisma).draw('e1', { prizeId: 'p1' }, 'admin'),
    ).rejects.toThrow('A drawn winner is always one of the holders');
  });

  it('404s a round of another event', async () => {
    const prisma = openPrisma();
    prisma.catRaceRound.findFirst.mockResolvedValue(null);

    await expect(
      buildService(prisma).voidRound('e1', 'nope', { reason: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('CatRaceService end', () => {
  it('404s an unknown event', async () => {
    const prisma = createPrisma();
    prisma.catRaceEvent.findUnique.mockResolvedValue(null);

    await expect(buildService(prisma).end('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('CatRaceService announcement', () => {
  const ended = (overrides: Record<string, unknown> = {}) => ({
    id: 'e1',
    name: 'Đợt',
    endedAt: NOW,
    discordPostedAt: null,
    prizes: [
      {
        name: 'Tiền mặt',
        rounds: [
          { winnerName: 'Alice', winner: { discordId: '111' } },
          { winnerName: 'Bob', winner: null },
        ],
      },
    ],
    ...overrides,
  });

  it('shapes the winners, with a null Discord id once the character is gone', async () => {
    const prisma = createPrisma();
    prisma.catRaceEvent.findUnique.mockResolvedValue(ended());

    expect(await buildService(prisma).announcement('e1')).toEqual({
      eventName: 'Đợt',
      prizes: [
        {
          name: 'Tiền mặt',
          winners: [
            { discordId: '111', name: 'Alice' },
            { discordId: null, name: 'Bob' },
          ],
        },
      ],
    });
  });

  it.each([
    [null, NotFoundException, 'Không tìm thấy đợt quay.'],
    [
      { endedAt: null },
      ConflictException,
      'Kết thúc đợt trước khi đăng tổng kết.',
    ],
    [
      { discordPostedAt: NOW },
      ConflictException,
      'Đợt này đã đăng lên Discord.',
    ],
  ])('refuses %j', async (override, error, message) => {
    const prisma = createPrisma();
    prisma.catRaceEvent.findUnique.mockResolvedValue(
      override === null ? null : ended(override),
    );

    const attempt = buildService(prisma).announcement('e1');

    await expect(attempt).rejects.toBeInstanceOf(error);
    await expect(attempt).rejects.toThrow(message);
  });

  it('stamps discordPostedAt from the clock', async () => {
    const prisma = createPrisma();

    await buildService(prisma).markAnnounced('e1');

    expect(prisma.catRaceEvent.update).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: { discordPostedAt: NOW },
    });
  });
});

describe('cryptoRandomInt', () => {
  it('stays inside [0, max)', () => {
    for (let i = 0; i < 50; i += 1) {
      const value = cryptoRandomInt(5);

      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(5);
    }
  });
});

describe('CatRaceService create roster guards', () => {
  it('rejects STANDARD tickets above 1 on create', async () => {
    const prisma = openPrisma();

    await expect(
      buildService(prisma).create(
        {
          mode: 'STANDARD' as never,
          participants: [{ characterId: 'a', tickets: 2 }],
          prizes: [],
        },
        'admin',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
