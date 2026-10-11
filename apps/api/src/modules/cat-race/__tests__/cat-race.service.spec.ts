import { BadRequestException, ConflictException } from '@nestjs/common';

import {
  buildService,
  createPrisma,
  NOW,
  openEvent,
} from './cat-race.fixtures';

const prize = { name: 'Tiền mặt', quantity: 2, tier: 'HIGH' as const };

describe('CatRaceService events and rosters', () => {
  it('names an unnamed event after the Vietnam day and seeds every prize with the roster', async () => {
    const prisma = createPrisma();
    prisma.character.count.mockResolvedValue(2);
    prisma.catRaceEvent.create.mockResolvedValue({
      id: 'e1',
      prizes: [{ id: 'p1' }],
    });
    prisma.catRaceEvent.findUnique.mockResolvedValue(openEvent());
    const service = buildService(prisma);

    await service.create(
      {
        mode: 'STANDARD' as never,
        participants: [
          { characterId: 'a', tickets: 1 },
          { characterId: 'b', tickets: 1 },
        ],
        prizes: [prize as never],
      },
      'admin',
    );

    const [call] = prisma.catRaceEvent.create.mock.calls as [
      [{ data: { name: string; createdAt: Date } }],
    ];
    const { data } = call[0];
    expect(data.name).toBe('Đợt quay 12/10/2026');
    expect(data.createdAt).toBe(NOW);
    expect(prisma.catRaceEntrant.createMany).toHaveBeenCalledWith({
      data: [
        { prizeId: 'p1', characterId: 'a' },
        { prizeId: 'p1', characterId: 'b' },
      ],
    });
  });

  it('rejects an unknown member in a roster', async () => {
    const prisma = createPrisma();
    prisma.catRaceEvent.findUnique.mockResolvedValue(openEvent());
    prisma.character.count.mockResolvedValue(1);
    const service = buildService(prisma);

    await expect(
      service.setParticipants('e1', {
        participants: [
          { characterId: 'a', tickets: 1 },
          { characterId: 'ghost', tickets: 1 },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects extra tickets in STANDARD mode', async () => {
    const prisma = createPrisma();
    prisma.catRaceEvent.findUnique.mockResolvedValue(
      openEvent({ mode: 'STANDARD' }),
    );
    const service = buildService(prisma);

    await expect(
      service.setParticipants('e1', {
        participants: [{ characterId: 'a', tickets: 2 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses a mode change once a round exists', async () => {
    const prisma = createPrisma();
    prisma.catRaceEvent.findUnique.mockResolvedValue(openEvent());
    prisma.catRaceRound.count.mockResolvedValue(1);
    const service = buildService(prisma);

    await expect(
      service.update('e1', { mode: 'STANDARD' as never }),
    ).rejects.toThrow('Không đổi chế độ khi đợt đã quay.');
  });

  it('resets every ticket to 1 when switching TICKET to STANDARD before any round', async () => {
    const prisma = createPrisma();
    prisma.catRaceEvent.findUnique.mockResolvedValue(openEvent());
    prisma.catRaceRound.count.mockResolvedValue(0);
    const service = buildService(prisma);

    await service.update('e1', { mode: 'STANDARD' as never });

    expect(prisma.catRaceParticipant.updateMany).toHaveBeenCalledWith({
      where: { eventId: 'e1' },
      data: { tickets: 1 },
    });
  });

  it('does not let a quantity drop below the rounds already won', async () => {
    const prisma = createPrisma();
    prisma.catRaceEvent.findUnique.mockResolvedValue(openEvent());
    prisma.catRacePrize.findFirst.mockResolvedValue({ id: 'p1' });
    prisma.catRaceRound.count.mockResolvedValue(3);
    const service = buildService(prisma);

    await expect(
      service.updatePrize('e1', 'p1', { quantity: 2 }),
    ).rejects.toThrow('Số lượng không được thấp hơn số giải đã trao (3).');
  });

  it.each([
    [
      'removePrize',
      (s: ReturnType<typeof buildService>) => s.removePrize('e1', 'p1'),
    ],
    ['remove', (s: ReturnType<typeof buildService>) => s.remove('e1')],
  ])('%s refuses once any round exists, voided or not', async (_name, call) => {
    const prisma = createPrisma();
    prisma.catRaceEvent.findUnique.mockResolvedValue(openEvent());
    prisma.catRacePrize.findFirst.mockResolvedValue({ id: 'p1' });
    prisma.catRaceRound.count.mockResolvedValue(1);

    await expect(call(buildService(prisma))).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rejects entrants who are not participants', async () => {
    const prisma = createPrisma();
    prisma.catRaceEvent.findUnique.mockResolvedValue(openEvent());
    prisma.catRacePrize.findFirst.mockResolvedValue({ id: 'p1' });
    prisma.catRaceParticipant.findMany.mockResolvedValue([
      { characterId: 'a' },
    ]);
    const service = buildService(prisma);

    await expect(
      service.setEntrants('e1', 'p1', { characterIds: ['a', 'x'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses every write on an ended event', async () => {
    const prisma = createPrisma();
    prisma.catRaceEvent.findUnique.mockResolvedValue(
      openEvent({ endedAt: NOW }),
    );
    const service = buildService(prisma);

    await expect(service.update('e1', { name: 'x' })).rejects.toThrow(
      'Đợt quay đã kết thúc.',
    );
    await expect(service.addPrize('e1', prize as never)).rejects.toThrow(
      'Đợt quay đã kết thúc.',
    );
  });

  it('takes the roster change from the rules: removed leave every prize, newcomers join open prizes', async () => {
    const prisma = createPrisma();
    prisma.catRaceEvent.findUnique.mockResolvedValue(openEvent());
    prisma.character.count.mockResolvedValue(2);
    prisma.catRaceParticipant.findMany.mockResolvedValue([
      { characterId: 'a', tickets: 1 },
      { characterId: 'z', tickets: 1 },
    ]);
    prisma.catRacePrize.findMany.mockResolvedValue([
      { id: 'p1', quantity: 2, rounds: [] },
    ]);
    const service = buildService(prisma);

    await service.setParticipants('e1', {
      participants: [
        { characterId: 'a', tickets: 3 },
        { characterId: 'x', tickets: 1 },
      ],
    });

    expect(prisma.catRaceEntrant.deleteMany).toHaveBeenCalledWith({
      where: { characterId: { in: ['z'] }, prize: { eventId: 'e1' } },
    });
    expect(prisma.catRaceEntrant.createMany).toHaveBeenCalledWith({
      data: [{ prizeId: 'p1', characterId: 'x' }],
      skipDuplicates: true,
    });
    expect(prisma.catRaceParticipant.update).toHaveBeenCalledWith({
      where: { eventId_characterId: { eventId: 'e1', characterId: 'a' } },
      data: { tickets: 3 },
    });
  });
});
