import { ConflictException, NotFoundException } from '@nestjs/common';

import {
  buildService,
  createPrisma,
  NOW,
  openEvent,
} from './cat-race.fixtures';

const roundRow = {
  id: 'r1',
  prizeId: 'p1',
  winnerCharacterId: 'b',
  winnerName: 'Bình',
  winnerGuildClass: 'TO_VAN',
  winnerTickets: 1,
  entrantCount: 2,
  totalTickets: 3,
  drawnAt: NOW,
  voidedAt: null,
  voidReason: null,
};

/** Prisma double set up for a draw on a prize with room left and entrants a (2 tickets) and b (1). */
function drawable() {
  const prisma = createPrisma();
  prisma.catRaceEvent.findUnique.mockResolvedValue(openEvent());
  prisma.catRacePrize.findFirst.mockResolvedValue({
    id: 'p1',
    quantity: 1,
  });
  prisma.catRaceRound.count.mockResolvedValue(0);
  prisma.catRaceEntrant.findMany.mockResolvedValue([
    { characterId: 'a' },
    { characterId: 'b' },
  ]);
  prisma.catRaceParticipant.findMany.mockResolvedValue([
    { characterId: 'a', tickets: 2 },
    { characterId: 'b', tickets: 1 },
  ]);
  prisma.character.findUniqueOrThrow.mockResolvedValue({
    id: 'b',
    name: 'Bình',
    guildClass: 'TO_VAN',
  });
  prisma.catRaceRound.create.mockResolvedValue(roundRow);

  return prisma;
}

describe('CatRaceService.draw', () => {
  it('stores the drawn winner and returns the field as it stood before the win', async () => {
    const prisma = drawable();
    const service = buildService(prisma, () => 2);

    const result = await service.draw('e1', { prizeId: 'p1' }, 'admin');

    const [[created]] = prisma.catRaceRound.create.mock.calls as [
      [{ data: unknown }],
    ];
    expect(created.data).toMatchObject({
      winnerCharacterId: 'b',
      winnerName: 'Bình',
      winnerGuildClass: 'TO_VAN',
      winnerTickets: 1,
      entrantCount: 2,
      totalTickets: 3,
      drawnById: 'admin',
      drawnAt: NOW,
    });
    expect(prisma.catRaceEntrant.delete).toHaveBeenCalledWith({
      where: { prizeId_characterId: { prizeId: 'p1', characterId: 'b' } },
    });
    expect(result.entrants).toEqual([
      { characterId: 'a', tickets: 2 },
      { characterId: 'b', tickets: 1 },
    ]);
    expect(result.winningTicket).toBe(1);
  });

  it('refuses a full prize', async () => {
    const prisma = drawable();
    prisma.catRaceRound.count.mockResolvedValue(1);

    await expect(
      buildService(prisma).draw('e1', { prizeId: 'p1' }, 'admin'),
    ).rejects.toThrow('Hạng mục đã đủ giải.');
  });

  it('refuses fewer than two entrants', async () => {
    const prisma = drawable();
    prisma.catRaceParticipant.findMany.mockResolvedValue([
      { characterId: 'a', tickets: 3 },
    ]);

    await expect(
      buildService(prisma).draw('e1', { prizeId: 'p1' }, 'admin'),
    ).rejects.toThrow('Cần ít nhất 2 người để đua.');
  });

  it('404s a prize of another event', async () => {
    const prisma = drawable();
    prisma.catRacePrize.findFirst.mockResolvedValue(null);

    await expect(
      buildService(prisma).draw('e1', { prizeId: 'other' }, 'admin'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('takes the row lock before it counts the active rounds, on the same transaction', async () => {
    const prisma = drawable();

    await buildService(prisma, () => 0).draw('e1', { prizeId: 'p1' }, 'admin');

    const lock = prisma.$queryRaw.mock.invocationCallOrder[0];
    const count = prisma.catRaceRound.count.mock.invocationCallOrder[0];
    expect(lock).toBeLessThan(count);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});

describe('CatRaceService.voidRound', () => {
  function voidable(participant: unknown) {
    const prisma = createPrisma();
    prisma.catRaceEvent.findUnique.mockResolvedValue(openEvent());
    prisma.catRaceRound.findFirst.mockResolvedValue(roundRow);
    prisma.catRaceParticipant.findUnique.mockResolvedValue(participant);

    return prisma;
  }

  it('puts the winner back among the entrants while they are still a participant', async () => {
    const prisma = voidable({ characterId: 'b' });

    await buildService(prisma).voidRound('e1', 'r1', { reason: 'nhầm' });

    expect(prisma.catRaceRound.update).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: { voidedAt: NOW, voidReason: 'nhầm' },
    });
    expect(prisma.catRaceEntrant.createMany).toHaveBeenCalledWith({
      data: [{ prizeId: 'p1', characterId: 'b' }],
      skipDuplicates: true,
    });
  });

  it('leaves no orphan entrant when the winner was removed from the event', async () => {
    const prisma = voidable(null);

    await buildService(prisma).voidRound('e1', 'r1', { reason: 'nhầm' });

    expect(prisma.catRaceEntrant.createMany).not.toHaveBeenCalled();
  });

  it('leaves no orphan entrant when the winner was deleted from the guild', async () => {
    const prisma = voidable({ characterId: 'b' });
    prisma.catRaceRound.findFirst.mockResolvedValue({
      ...roundRow,
      winnerCharacterId: null,
    });

    await buildService(prisma).voidRound('e1', 'r1', { reason: 'nhầm' });

    expect(prisma.catRaceEntrant.createMany).not.toHaveBeenCalled();
  });

  it('refuses a round that is already void', async () => {
    const prisma = voidable({ characterId: 'b' });
    prisma.catRaceRound.findFirst.mockResolvedValue({
      ...roundRow,
      voidedAt: NOW,
    });

    await expect(
      buildService(prisma).voidRound('e1', 'r1', { reason: 'x' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('CatRaceService.end', () => {
  it('stamps endedAt from the clock', async () => {
    const prisma = createPrisma();
    prisma.catRaceEvent.findUnique.mockResolvedValue(openEvent());

    await buildService(prisma).end('e1');

    expect(prisma.catRaceEvent.update).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: { endedAt: NOW },
    });
  });

  it('changes nothing when the event already ended', async () => {
    const prisma = createPrisma();
    prisma.catRaceEvent.findUnique.mockResolvedValue(
      openEvent({ endedAt: NOW }),
    );

    await buildService(prisma).end('e1');

    expect(prisma.catRaceEvent.update).not.toHaveBeenCalled();
  });
});
