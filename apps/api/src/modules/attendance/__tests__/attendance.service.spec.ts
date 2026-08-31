import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { GuildClass, GuildRole } from '@guild/shared/enums';

import { FixedClock, TOKEN_TYPE, type JwtPayload } from '../../../common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { BattleSessionsService } from '../../battle-sessions/battle-sessions.public';
import { CharactersService } from '../../characters/characters.public';
import { AttendanceService } from '../attendance.service';

/**
 * Build a Date from Vietnam time (UTC+7) for readability in tests.
 * @param iso - A string like '2026-07-22T12:00', read as Vietnam time
 * @returns The matching UTC Date
 */
function vn(iso: string): Date {
  return new Date(`${iso}:00+07:00`);
}

// Wednesday — the Saturday Guild War is still open, the Tuesday session is past 10:00 and locked.
const WEDNESDAY = vn('2026-07-22T12:00');
const CHARACTER_ID = 'char-1';

/** Character row of the signed-in user, as `findById` returns it. */
const OWN_ROW = {
  id: CHARACTER_ID,
  name: 'Huy',
  guildClass: GuildClass.THIET_Y,
};

/** Someone else's character — used to test marking on their behalf. */
const OTHER_CHARACTER_ID = 'char-2';

/** Signed-in admin — may fix past-deadline sessions and mark for others. */
const ADMIN: JwtPayload = {
  sub: '999888777666555444',
  role: GuildRole.ADMIN,
  type: TOKEN_TYPE.access,
};

/** Signed-in member, bound to CHARACTER_ID. */
const MEMBER: JwtPayload = {
  sub: '123456789012345678',
  role: GuildRole.MEMBER,
  type: TOKEN_TYPE.access,
};

/** Session ids in the fake schedule, keyed by label for readability. */
const SESSION_IDS: Record<string, string> = {
  'Thứ 3 · 20:30': 'session-tue',
  'Thứ 7 · Bang Chiến': 'session-sat',
};

/** The open week's schedule as BattleSessionsService returns it. */
const SESSIONS = [
  {
    id: 'session-tue',
    label: 'Thứ 3 · 20:30',
    dateTime: vn('2026-07-21T20:30').toISOString(),
    deadline: vn('2026-07-21T10:00').toISOString(),
    isGuildWar: false,
    opponent: 'Hắc Long Đường',
    weekStart: vn('2026-07-20T00:00').toISOString(),
    attendanceCount: 0,
    matchCount: 2,
    formationMatchCount: 0,
  },
  {
    id: 'session-sat',
    label: 'Thứ 7 · Bang Chiến',
    dateTime: vn('2026-07-25T20:00').toISOString(),
    deadline: vn('2026-07-23T17:00').toISOString(),
    isGuildWar: true,
    opponent: null,
    weekStart: vn('2026-07-20T00:00').toISOString(),
    attendanceCount: 0,
    matchCount: 2,
    formationMatchCount: 0,
  },
];

describe('AttendanceService', () => {
  let service: AttendanceService;
  /** Build the service with a fixed clock — a few tests need a moment other than WEDNESDAY. */
  let makeService: (now: Date) => AttendanceService;
  let prisma: {
    attendanceRecord: {
      upsert: jest.Mock;
      findMany: jest.Mock;
      groupBy: jest.Mock;
    };
  };
  let battleSessions: {
    listByWeek: jest.Mock;
    findById: jest.Mock;
    getActiveWeek: jest.Mock;
  };
  let characters: {
    listRows: jest.Mock;
    exists: jest.Mock;
    findByDiscordId: jest.Mock;
    findById: jest.Mock;
  };

  /**
   * Make `findById` return the fake schedule with the past-deadline flags computed at `now`,
   * exactly as the real BattleSessionsService does.
   * @param now - Moment used to compute `isDeadlinePassed`
   */
  const stubSchedule = (now: Date): void => {
    battleSessions.findById.mockImplementation((id: string) => {
      const found = SESSIONS.find((item) => item.id === id);

      return Promise.resolve(
        found
          ? {
              ...found,
              isDeadlinePassed:
                now.getTime() > new Date(found.deadline).getTime(),
            }
          : null,
      );
    });
  };

  beforeEach(() => {
    makeService = (now: Date) =>
      new AttendanceService(
        prisma as unknown as PrismaService,
        battleSessions as unknown as BattleSessionsService,
        characters as unknown as CharactersService,
        new FixedClock(now),
      );

    prisma = {
      attendanceRecord: {
        upsert: jest.fn().mockImplementation(
          (args: {
            create: { characterId: string; sessionId: string };
            update: {
              isPresent: boolean;
              markedAt: Date;
              reason: string | null;
            };
          }) =>
            Promise.resolve({
              characterId: args.create.characterId,
              sessionId: args.create.sessionId,
              isPresent: args.update.isPresent,
              markedAt: args.update.markedAt,
              reason: args.update.reason,
            }),
        ),
        findMany: jest.fn().mockResolvedValue([]),
        groupBy: jest.fn().mockResolvedValue([]),
      },
    };

    battleSessions = {
      listByWeek: jest.fn().mockResolvedValue(SESSIONS),
      findById: jest.fn(),
      getActiveWeek: jest.fn().mockReturnValue(vn('2026-07-20T00:00')),
    };

    characters = {
      listRows: jest.fn().mockResolvedValue([]),
      exists: jest.fn().mockResolvedValue(true),
      findByDiscordId: jest
        .fn()
        .mockResolvedValue({ id: CHARACTER_ID, role: GuildRole.MEMBER }),
      findById: jest.fn().mockResolvedValue(OWN_ROW),
    };

    stubSchedule(WEDNESDAY);
    service = makeService(WEDNESDAY);
  });

  describe('mark', () => {
    it('ghi nhận điểm danh khi còn hạn', async () => {
      const record = await service.mark(
        {
          characterId: CHARACTER_ID,
          sessionId: SESSION_IDS['Thứ 7 · Bang Chiến'],
          isPresent: true,
        },
        MEMBER,
      );

      expect(record).toEqual({
        characterId: CHARACTER_ID,
        sessionId: SESSION_IDS['Thứ 7 · Bang Chiến'],
        isPresent: true,
        markedAt: WEDNESDAY.toISOString(),
        reason: null,
      });
    });

    it('cho đổi Có ⇄ Không khi còn hạn (upsert theo cặp nhân vật + trận)', async () => {
      await service.mark(
        {
          characterId: CHARACTER_ID,
          sessionId: SESSION_IDS['Thứ 7 · Bang Chiến'],
          isPresent: true,
        },
        MEMBER,
      );
      const changed = await service.mark(
        {
          characterId: CHARACTER_ID,
          sessionId: SESSION_IDS['Thứ 7 · Bang Chiến'],
          isPresent: false,
        },
        MEMBER,
      );

      expect(changed.isPresent).toBe(false);
      expect(prisma.attendanceRecord.upsert).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: {
            characterId_sessionId: {
              characterId: CHARACTER_ID,
              sessionId: SESSION_IDS['Thứ 7 · Bang Chiến'],
            },
          },
        }),
      );
    });

    it('từ chối khi không có nhân vật', async () => {
      characters.exists.mockResolvedValue(false);

      await expect(
        service.mark(
          {
            characterId: 'khong-ton-tai',
            sessionId: SESSION_IDS['Thứ 7 · Bang Chiến'],
            isPresent: true,
          },
          MEMBER,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('từ chối khi trận không còn tồn tại', async () => {
      await expect(
        service.mark(
          {
            characterId: CHARACTER_ID,
            sessionId: 'session-da-xoa',
            isPresent: true,
          },
          MEMBER,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('khóa trận đã quá hạn — Thứ 4 thì trận Thứ 3 không sửa được nữa', async () => {
      await expect(
        service.mark(
          {
            characterId: CHARACTER_ID,
            sessionId: SESSION_IDS['Thứ 3 · 20:30'],
            isPresent: true,
          },
          MEMBER,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('quản trị viên điểm danh hộ được', async () => {
      const record = await service.mark(
        {
          characterId: CHARACTER_ID,
          sessionId: SESSION_IDS['Thứ 7 · Bang Chiến'],
          isPresent: true,
        },
        ADMIN,
      );

      expect(record.isPresent).toBe(true);
      expect(prisma.attendanceRecord.upsert).toHaveBeenCalled();
    });

    it('quản trị viên sửa được cả trận đã quá hạn', async () => {
      const record = await service.mark(
        {
          characterId: CHARACTER_ID,
          sessionId: SESSION_IDS['Thứ 3 · 20:30'],
          isPresent: false,
        },
        ADMIN,
      );

      expect(record.isPresent).toBe(false);
      expect(record.sessionId).toBe(SESSION_IDS['Thứ 3 · 20:30']);
    });

    it('sau 17:00 Thứ 5 thì khóa cả Guild War Thứ 7', async () => {
      const justPastDeadline = vn('2026-07-23T17:01');
      stubSchedule(justPastDeadline);

      await expect(
        makeService(justPastDeadline).mark(
          {
            characterId: CHARACTER_ID,
            sessionId: SESSION_IDS['Thứ 7 · Bang Chiến'],
            isPresent: true,
          },
          MEMBER,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('quyết định theo cờ của lịch đánh, không tự tính lại từ hạn chót', async () => {
      // The schedule says "not past deadline" while the deadline itself is in the past. These two
      // can only diverge with two clocks — exactly what the old code created. With a single place
      // evaluating the rule the flag wins, so the entry must go through.
      battleSessions.findById.mockResolvedValue({
        ...SESSIONS[0],
        isDeadlinePassed: false,
      });

      const record = await service.mark(
        {
          characterId: CHARACTER_ID,
          sessionId: SESSION_IDS['Thứ 3 · 20:30'],
          isPresent: true,
        },
        MEMBER,
      );

      expect(record.isPresent).toBe(true);
    });
  });

  describe('lý do vắng', () => {
    const SATURDAY = SESSION_IDS['Thứ 7 · Bang Chiến'];

    it('lưu lý do khi trả lời "Không"', async () => {
      const record = await service.mark(
        {
          characterId: CHARACTER_ID,
          sessionId: SATURDAY,
          isPresent: false,
          reason: 'Bận đi công tác',
        },
        MEMBER,
      );

      expect(record.reason).toBe('Bận đi công tác');
    });

    it('bỏ lý do khi trả lời "Có", dù body có gửi', async () => {
      const record = await service.mark(
        {
          characterId: CHARACTER_ID,
          sessionId: SATURDAY,
          isPresent: true,
          reason: 'Bận đi công tác',
        },
        MEMBER,
      );

      expect(record.reason).toBeNull();
    });

    it('lý do rỗng và không gửi lý do đều thành null', async () => {
      const empty = await service.mark(
        {
          characterId: CHARACTER_ID,
          sessionId: SATURDAY,
          isPresent: false,
          reason: '',
        },
        MEMBER,
      );
      const missing = await service.mark(
        { characterId: CHARACTER_ID, sessionId: SATURDAY, isPresent: false },
        MEMBER,
      );

      expect(empty.reason).toBeNull();
      expect(missing.reason).toBeNull();
    });

    it('ghi lý do vào cả nhánh tạo mới lẫn nhánh cập nhật của upsert', async () => {
      await service.mark(
        {
          characterId: CHARACTER_ID,
          sessionId: SATURDAY,
          isPresent: false,
          reason: 'Ốm',
        },
        MEMBER,
      );

      const [args] = prisma.attendanceRecord.upsert.mock.calls[0] as [
        {
          create: { reason: string | null };
          update: { reason: string | null };
        },
      ];
      expect(args.create.reason).toBe('Ốm');
      expect(args.update.reason).toBe('Ốm');
    });
  });

  describe('getCharacters', () => {
    it('trả cả bang, đã lược danh tính Discord', async () => {
      characters.listRows.mockResolvedValue([
        { ...OWN_ROW, discordId: '123456789012345678', role: GuildRole.MEMBER },
        { id: OTHER_CHARACTER_ID, name: 'Mèo', guildClass: GuildClass.TO_VAN },
      ]);

      await expect(service.getCharacters()).resolves.toEqual([
        OWN_ROW,
        { id: OTHER_CHARACTER_ID, name: 'Mèo', guildClass: GuildClass.TO_VAN },
      ]);
    });
  });

  describe('điểm danh theo vai', () => {
    it('bang chúng điểm danh hộ người khác thì bị chặn', async () => {
      await expect(
        service.mark(
          {
            characterId: OTHER_CHARACTER_ID,
            sessionId: SESSION_IDS['Thứ 7 · Bang Chiến'],
            isPresent: true,
          },
          MEMBER,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.attendanceRecord.upsert).not.toHaveBeenCalled();
    });

    it('quản trị viên điểm danh hộ được và ghi lại người bấm', async () => {
      characters.findByDiscordId.mockResolvedValue(null);

      await service.mark(
        {
          characterId: OTHER_CHARACTER_ID,
          sessionId: SESSION_IDS['Thứ 7 · Bang Chiến'],
          isPresent: true,
        },
        ADMIN,
      );

      const [args] = prisma.attendanceRecord.upsert.mock.calls[0] as [
        {
          create: { markedByCharacterId: string | null };
          update: { markedByCharacterId: string | null };
        },
      ];
      expect(args.create.markedByCharacterId).toBeNull();
      expect(args.update.markedByCharacterId).toBeNull();
    });
  });

  describe('getSummary', () => {
    it('đếm Có/Không theo từng trận, không kèm danh tính', async () => {
      prisma.attendanceRecord.groupBy.mockResolvedValue([
        {
          sessionId: 'session-sat',
          isPresent: true,
          _count: { _all: 3 },
        },
        {
          sessionId: 'session-sat',
          isPresent: false,
          _count: { _all: 1 },
        },
      ]);

      await expect(service.getSummary()).resolves.toEqual([
        { sessionId: 'session-tue', coCount: 0, khongCount: 0 },
        { sessionId: 'session-sat', coCount: 3, khongCount: 1 },
      ]);
    });
  });

  describe('getRecords', () => {
    it('chỉ đọc record của các trận trong tuần đang mở', async () => {
      prisma.attendanceRecord.findMany.mockResolvedValue([]);

      await service.getRecords();

      expect(prisma.attendanceRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sessionId: { in: ['session-tue', 'session-sat'] } },
        }),
      );
    });

    it('không lọc theo nhân vật — ai cũng đọc được lượt của cả bang', async () => {
      prisma.attendanceRecord.findMany.mockResolvedValue([]);

      await service.getRecords();

      const [args] = prisma.attendanceRecord.findMany.mock.calls[0] as [
        { where: { characterId?: string } },
      ];
      expect(args.where.characterId).toBeUndefined();
    });

    it('dựng record qua codec — markedAt ra ISO string', async () => {
      prisma.attendanceRecord.findMany.mockResolvedValue([
        {
          characterId: CHARACTER_ID,
          sessionId: 'session-sat',
          isPresent: true,
          markedAt: WEDNESDAY,
          reason: null,
        },
      ]);

      await expect(service.getRecords()).resolves.toEqual([
        {
          characterId: CHARACTER_ID,
          sessionId: 'session-sat',
          isPresent: true,
          markedAt: WEDNESDAY.toISOString(),
          reason: null,
        },
      ]);
    });
  });
});
