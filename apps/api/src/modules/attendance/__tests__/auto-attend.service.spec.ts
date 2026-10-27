import { NotFoundException } from '@nestjs/common';
import { GuildRole } from '@guild/shared/enums';

import { FixedClock, TOKEN_TYPE, type RequestActor } from '../../../common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { CharactersService } from '../../characters/characters.public';
import { AutoAttendService } from '../auto-attend.service';
import { vn } from '../../../__tests__/vn-date';

const NOW = vn('2026-10-27T12:00');
const CHARACTER_ID = 'char-1';

const MEMBER: RequestActor = {
  sub: 'member-discord',
  role: GuildRole.MEMBER,
  type: TOKEN_TYPE.access,
  capabilities: [],
  grantedCommands: [],
};

const RUNNING = {
  id: 'p1',
  characterId: CHARACTER_ID,
  enabledAt: vn('2026-10-20T08:00'),
  disabledAt: null,
};

describe('AutoAttendService', () => {
  let prisma: {
    $transaction: jest.Mock;
    $executeRaw: jest.Mock;
    autoAttendPeriod: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let characters: { findByDiscordId: jest.Mock };
  let service: AutoAttendService;

  beforeEach(() => {
    prisma = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      autoAttendPeriod: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest
          .fn()
          .mockImplementation((args: { data: Record<string, unknown> }) =>
            Promise.resolve({ id: 'new', disabledAt: null, ...args.data }),
          ),
        update: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn((run: (client: unknown) => unknown) => run(prisma)),
    };
    characters = {
      findByDiscordId: jest.fn().mockResolvedValue({ id: CHARACTER_ID }),
    };
    service = new AutoAttendService(
      prisma as unknown as PrismaService,
      characters as unknown as CharactersService,
      new FixedClock(NOW),
    );
  });

  describe('status', () => {
    it('reports off when no period is running', async () => {
      await expect(service.status(MEMBER)).resolves.toEqual({
        enabled: false,
        enabledAt: null,
      });
    });

    it('reports on since the running period started', async () => {
      prisma.autoAttendPeriod.findFirst.mockResolvedValue(RUNNING);

      await expect(service.status(MEMBER)).resolves.toEqual({
        enabled: true,
        enabledAt: RUNNING.enabledAt.toISOString(),
      });
    });

    it('refuses a caller without a character', async () => {
      characters.findByDiscordId.mockResolvedValue(null);

      await expect(service.status(MEMBER)).rejects.toThrow(NotFoundException);
    });
  });

  describe('set', () => {
    it('opens a period at the current moment when turned on', async () => {
      await expect(service.set(MEMBER, true)).resolves.toEqual({
        enabled: true,
        enabledAt: NOW.toISOString(),
      });
      expect(prisma.autoAttendPeriod.create).toHaveBeenCalledWith({
        data: { characterId: CHARACTER_ID, enabledAt: NOW },
      });
    });

    it('opens no second period when already on', async () => {
      prisma.autoAttendPeriod.findFirst.mockResolvedValue(RUNNING);

      await expect(service.set(MEMBER, true)).resolves.toEqual({
        enabled: true,
        enabledAt: RUNNING.enabledAt.toISOString(),
      });
      expect(prisma.autoAttendPeriod.create).not.toHaveBeenCalled();
    });

    it('closes the running period at the current moment when turned off', async () => {
      prisma.autoAttendPeriod.findFirst.mockResolvedValue(RUNNING);

      await expect(service.set(MEMBER, false)).resolves.toEqual({
        enabled: false,
        enabledAt: null,
      });
      expect(prisma.autoAttendPeriod.update).toHaveBeenCalledWith({
        where: { id: RUNNING.id },
        data: { disabledAt: NOW },
      });
    });

    it('changes nothing when turned off while already off', async () => {
      await expect(service.set(MEMBER, false)).resolves.toEqual({
        enabled: false,
        enabledAt: null,
      });
      expect(prisma.autoAttendPeriod.update).not.toHaveBeenCalled();
    });

    it('takes the per-character lock before reading the running period', async () => {
      await service.set(MEMBER, true);

      expect(prisma.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
        prisma.autoAttendPeriod.findFirst.mock.invocationCallOrder[0],
      );
    });

    it('refuses a caller without a character', async () => {
      characters.findByDiscordId.mockResolvedValue(null);

      await expect(service.set(MEMBER, true)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('windowsForSessions', () => {
    const session = (id: string, day: string) => ({
      id,
      dateTime: vn(`${day}T20:00`),
      deadline: vn(`${day}T12:00`),
      attendanceClosedAt: null,
    });

    it('reads nothing for no sessions', async () => {
      await expect(service.windowsForSessions([])).resolves.toEqual([]);
      expect(prisma.autoAttendPeriod.findMany).not.toHaveBeenCalled();
    });

    it('asks only for periods that can reach the closing moments read', async () => {
      await service.windowsForSessions([
        session('a', '2026-10-27'),
        session('b', '2026-10-31'),
      ]);

      expect(prisma.autoAttendPeriod.findMany).toHaveBeenCalledWith({
        where: {
          enabledAt: { lt: vn('2026-10-31T12:00') },
          OR: [
            { disabledAt: null },
            { disabledAt: { gte: vn('2026-10-27T12:00') } },
          ],
        },
      });
    });

    it('hands back the periods as the coverage rule reads them', async () => {
      prisma.autoAttendPeriod.findMany.mockResolvedValue([RUNNING]);

      await expect(
        service.windowsForSessions([session('a', '2026-10-27')]),
      ).resolves.toEqual([
        {
          id: RUNNING.id,
          characterId: CHARACTER_ID,
          enabledAt: RUNNING.enabledAt,
          disabledAt: null,
        },
      ]);
    });
  });
});
