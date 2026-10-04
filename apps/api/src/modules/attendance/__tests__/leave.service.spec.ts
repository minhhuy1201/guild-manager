import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { GuildRole } from '@guild/shared/enums';

import { FixedClock, TOKEN_TYPE, type JwtPayload } from '../../../common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { BattleSessionsService } from '../../battle-sessions/battle-sessions.public';
import { CharactersService } from '../../characters/characters.public';
import { TeamBuilderService } from '../../team-builder/team-builder.public';
import { LeaveService } from '../leave.service';
import { vn } from '../../../__tests__/vn-date';

// Sunday 2026-10-04 12:00 VN.
const NOW = vn('2026-10-04T12:00');
const MEMBER_CHARACTER = 'char-1';
const OTHER_CHARACTER = 'char-2';

const MEMBER: JwtPayload = {
  sub: 'member-discord',
  role: GuildRole.MEMBER,
  type: TOKEN_TYPE.access,
};
const ADMIN: JwtPayload = {
  sub: 'admin-discord',
  role: GuildRole.ADMIN,
  type: TOKEN_TYPE.access,
};

/** Open session (deadline in the future) and a closed one (deadline passed), both inside the range. */
const OPEN_SESSION = {
  id: 'open',
  dateTime: vn('2026-10-10T20:00'),
  deadline: vn('2026-10-10T12:00'),
  attendanceClosedAt: null,
};
const CLOSED_SESSION = {
  id: 'closed',
  dateTime: vn('2026-10-04T20:00'),
  deadline: vn('2026-10-04T10:00'),
  attendanceClosedAt: null,
};

/** A Leave row as Prisma returns it: `@db.Date` columns come back as 00:00 UTC. */
const leaveRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'leave-1',
  characterId: MEMBER_CHARACTER,
  startDate: new Date('2026-10-05T00:00:00Z'),
  endDate: new Date('2026-10-12T00:00:00Z'),
  reason: null,
  createdAt: NOW,
  createdByCharacterId: MEMBER_CHARACTER,
  createdByAdmin: false,
  cancelledAt: null,
  cancelledByCharacterId: null,
  cancelledByAdmin: false,
  ...overrides,
});

describe('LeaveService', () => {
  let service: LeaveService;
  let prisma: {
    $transaction: jest.Mock;
    leave: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    attendanceRecord: { deleteMany: jest.Mock };
  };
  let battleSessions: { readCoverageInRange: jest.Mock };
  let characters: { exists: jest.Mock; findByDiscordId: jest.Mock };
  let teamBuilder: { releaseCharacterFromSession: jest.Mock };

  /** Who the caller's Discord id resolves to; null = rescue admin without a character. */
  const signInAs = (characterId: string | null): void => {
    characters.findByDiscordId.mockResolvedValue(
      characterId ? { id: characterId } : null,
    );
  };

  /** The `data` the service passed to `leave.create`. */
  const createdData = (): Record<string, unknown> =>
    (
      prisma.leave.create.mock.calls[0] as [{ data: Record<string, unknown> }]
    )[0].data;

  const createInput = (overrides: Record<string, unknown> = {}) => ({
    characterId: MEMBER_CHARACTER,
    startDate: '2026-10-04',
    endDate: '2026-10-12',
    reason: null,
    ...overrides,
  });

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      leave: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest
          .fn()
          .mockImplementation(({ data }: { data: Record<string, unknown> }) =>
            // Columns the service leaves out come back as null, as from the real database.
            Promise.resolve({
              id: 'new',
              cancelledAt: null,
              cancelledByCharacterId: null,
              ...data,
            }),
          ),
        update: jest
          .fn()
          .mockImplementation(({ data }: { data: Record<string, unknown> }) =>
            Promise.resolve(leaveRow(data)),
          ),
      },
      attendanceRecord: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) =>
      fn(prisma),
    );
    battleSessions = {
      readCoverageInRange: jest
        .fn()
        .mockResolvedValue([OPEN_SESSION, CLOSED_SESSION]),
    };
    characters = {
      exists: jest.fn().mockResolvedValue(true),
      findByDiscordId: jest.fn(),
    };
    teamBuilder = {
      releaseCharacterFromSession: jest.fn().mockResolvedValue(0),
    };
    signInAs(MEMBER_CHARACTER);

    service = new LeaveService(
      prisma as unknown as PrismaService,
      battleSessions as unknown as BattleSessionsService,
      characters as unknown as CharactersService,
      teamBuilder as unknown as TeamBuilderService,
      new FixedClock(NOW),
    );
  });

  describe('create - validation', () => {
    it('404 when the character does not exist', async () => {
      characters.exists.mockResolvedValue(false);

      await expect(service.create(createInput(), MEMBER)).rejects.toThrow(
        new NotFoundException('Không tìm thấy thành viên.'),
      );
    });

    it('403 when a member files for somebody else', async () => {
      await expect(
        service.create(createInput({ characterId: OTHER_CHARACTER }), MEMBER),
      ).rejects.toThrow(
        new ForbiddenException('Bạn chỉ khai nghỉ được cho nhân vật của mình.'),
      );
    });

    it('lets an admin file for somebody else and records the admin as author', async () => {
      signInAs('admin-char');

      await service.create(
        createInput({ characterId: OTHER_CHARACTER }),
        ADMIN,
      );

      expect(createdData()).toMatchObject({
        characterId: OTHER_CHARACTER,
        createdByCharacterId: 'admin-char',
        createdByAdmin: true,
      });
    });

    it('records no author character for a rescue admin', async () => {
      signInAs(null);

      await service.create(
        createInput({ characterId: OTHER_CHARACTER }),
        ADMIN,
      );

      expect(createdData()).toMatchObject({
        createdByCharacterId: null,
        createdByAdmin: true,
      });
    });

    it('400 when a member ends the leave before today', async () => {
      await expect(
        service.create(
          createInput({ startDate: '2026-10-01', endDate: '2026-10-03' }),
          MEMBER,
        ),
      ).rejects.toThrow(new BadRequestException('Ngày kết thúc đã qua.'));
    });

    it('accepts a member leave ending today', async () => {
      await expect(
        service.create(
          createInput({ startDate: '2026-10-03', endDate: '2026-10-04' }),
          MEMBER,
        ),
      ).resolves.toMatchObject({ characterId: MEMBER_CHARACTER });
    });

    it('accepts an admin leave in the past', async () => {
      signInAs('admin-char');

      await expect(
        service.create(
          createInput({ startDate: '2026-10-01', endDate: '2026-10-03' }),
          ADMIN,
        ),
      ).resolves.toBeDefined();
    });

    it('409 naming the range when it overlaps an active leave', async () => {
      prisma.leave.findMany.mockResolvedValue([
        leaveRow({
          startDate: new Date('2026-10-12T00:00:00Z'),
          endDate: new Date('2026-10-15T00:00:00Z'),
        }),
      ]);

      await expect(service.create(createInput(), MEMBER)).rejects.toThrow(
        new ConflictException('Khoảng nghỉ trùng với lần nghỉ 12/10 - 15/10.'),
      );
    });

    it('only compares against leaves that are not cancelled', async () => {
      await service.create(createInput(), MEMBER);

      expect(prisma.leave.findMany).toHaveBeenCalledWith({
        where: { characterId: MEMBER_CHARACTER, cancelledAt: null },
      });
    });

    it('accepts a leave that starts the day after another one ends', async () => {
      prisma.leave.findMany.mockResolvedValue([
        leaveRow({
          startDate: new Date('2026-09-28T00:00:00Z'),
          endDate: new Date('2026-10-03T00:00:00Z'),
        }),
      ]);

      await expect(
        service.create(createInput(), MEMBER),
      ).resolves.toBeDefined();
    });
  });

  describe('create - side effects', () => {
    it('member: clears the answer and the line-up only for days still open', async () => {
      await service.create(createInput(), MEMBER);

      expect(prisma.attendanceRecord.deleteMany).toHaveBeenCalledWith({
        where: { characterId: MEMBER_CHARACTER, sessionId: { in: ['open'] } },
      });
      expect(teamBuilder.releaseCharacterFromSession).toHaveBeenCalledTimes(1);
      expect(teamBuilder.releaseCharacterFromSession).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'open' }),
        MEMBER_CHARACTER,
        prisma,
      );
    });

    it('admin: also overrides the answer of a closed day', async () => {
      signInAs('admin-char');

      await service.create(createInput(), ADMIN);

      expect(prisma.attendanceRecord.deleteMany).toHaveBeenCalledWith({
        where: {
          characterId: MEMBER_CHARACTER,
          sessionId: { in: ['open', 'closed'] },
        },
      });
      expect(teamBuilder.releaseCharacterFromSession).toHaveBeenCalledTimes(2);
    });

    it('stamps createdAt from the clock and a member as non-admin', async () => {
      await service.create(createInput(), MEMBER);

      expect(createdData()).toMatchObject({
        createdAt: NOW,
        createdByAdmin: false,
        cancelledByAdmin: false,
        startDate: new Date('2026-10-04T00:00:00Z'),
        endDate: new Date('2026-10-12T00:00:00Z'),
      });
    });

    it('returns who filed the leave', async () => {
      signInAs('admin-char');

      await expect(
        service.create(createInput({ characterId: OTHER_CHARACTER }), ADMIN),
      ).resolves.toMatchObject({ createdByCharacterId: 'admin-char' });
    });

    it('returns a null filer for a rescue admin', async () => {
      signInAs(null);

      await expect(
        service.create(createInput({ characterId: OTHER_CHARACTER }), ADMIN),
      ).resolves.toMatchObject({ createdByCharacterId: null });
    });

    it('returns dates as YYYY-MM-DD', async () => {
      await expect(
        service.create(createInput(), MEMBER),
      ).resolves.toMatchObject({
        startDate: '2026-10-04',
        endDate: '2026-10-12',
      });
    });
  });

  describe('cancel', () => {
    it('404 when the leave does not exist', async () => {
      prisma.leave.findUnique.mockResolvedValue(null);

      await expect(service.cancel('nope', MEMBER)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('403 when a member cancels somebody else’s leave', async () => {
      prisma.leave.findUnique.mockResolvedValue(
        leaveRow({ characterId: OTHER_CHARACTER }),
      );

      await expect(service.cancel('leave-1', MEMBER)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('stamps who and when, and whether it was an admin', async () => {
      prisma.leave.findUnique.mockResolvedValue(leaveRow());
      signInAs('admin-char');

      await service.cancel('leave-1', ADMIN);

      expect(prisma.leave.update).toHaveBeenCalledWith({
        where: { id: 'leave-1' },
        data: {
          cancelledAt: NOW,
          cancelledByCharacterId: 'admin-char',
          cancelledByAdmin: true,
        },
      });
    });

    it('returns an already cancelled leave untouched', async () => {
      prisma.leave.findUnique.mockResolvedValue(
        leaveRow({ cancelledAt: vn('2026-10-03T08:00') }),
      );

      await expect(service.cancel('leave-1', MEMBER)).resolves.toMatchObject({
        id: 'leave-1',
      });
      expect(prisma.leave.update).not.toHaveBeenCalled();
    });
  });

  describe('listActive', () => {
    it('asks for uncancelled leaves ending today or later, soonest first', async () => {
      await service.listActive();

      expect(prisma.leave.findMany).toHaveBeenCalledWith({
        where: {
          cancelledAt: null,
          endDate: { gte: new Date('2026-10-04T00:00:00Z') },
        },
        orderBy: { startDate: 'asc' },
      });
    });

    it('narrows to one character for listActiveFor', async () => {
      await service.listActiveFor(MEMBER_CHARACTER);

      expect(prisma.leave.findMany).toHaveBeenCalledWith({
        where: {
          characterId: MEMBER_CHARACTER,
          cancelledAt: null,
          endDate: { gte: new Date('2026-10-04T00:00:00Z') },
        },
        orderBy: { startDate: 'asc' },
      });
    });
  });

  describe('windowsForSessions', () => {
    it('returns nothing without querying when there are no sessions', async () => {
      await expect(service.windowsForSessions([])).resolves.toEqual([]);
      expect(prisma.leave.findMany).not.toHaveBeenCalled();
    });

    it('reads leaves overlapping the sessions’ days, cancelled ones included', async () => {
      prisma.leave.findMany.mockResolvedValue([leaveRow()]);

      const windows = await service.windowsForSessions([
        OPEN_SESSION,
        CLOSED_SESSION,
      ]);

      expect(prisma.leave.findMany).toHaveBeenCalledWith({
        where: {
          startDate: { lte: new Date('2026-10-10T00:00:00Z') },
          endDate: { gte: new Date('2026-10-04T00:00:00Z') },
        },
        // Two leaves can cover one cell (a cancelled one still covers days that closed before it);
        // newest first makes the one the cell reads deterministic.
        orderBy: { createdAt: 'desc' },
      });
      expect(windows[0]).toMatchObject({
        startDate: '2026-10-05',
        endDate: '2026-10-12',
        createdAt: NOW,
      });
    });
  });
});
