import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AttendanceStatus, GuildClass, GuildRole } from '@guild/shared/enums';

import { FixedClock, TOKEN_TYPE, type JwtPayload } from '../../../common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { BattleSessionsService } from '../../battle-sessions/battle-sessions.public';
import { CharactersService } from '../../characters/characters.public';
import { AttendanceService } from '../attendance.service';

/**
 * Tạo Date từ giờ Việt Nam (UTC+7) cho dễ đọc trong test.
 * @param iso - Chuỗi dạng '2026-07-22T12:00' hiểu theo giờ VN
 * @returns Date UTC tương ứng
 */
function vn(iso: string): Date {
  return new Date(`${iso}:00+07:00`);
}

// Thứ 4 — Guild War Thứ 7 còn hạn, trận Thứ 3 đã qua 10:00 nên bị khóa.
const WEDNESDAY = vn('2026-07-22T12:00');
const CHARACTER_ID = 'char-1';

/** Hàng Character của người đang đăng nhập, như `findById` trả về. */
const OWN_ROW = {
  id: CHARACTER_ID,
  name: 'Huy',
  guildClass: GuildClass.THIET_Y,
};

/** Nhân vật của người khác — dùng để thử điểm danh hộ. */
const OTHER_CHARACTER_ID = 'char-2';

/** Quản trị viên đang đăng nhập — sửa được cả trận đã quá hạn và điểm danh hộ người khác. */
const ADMIN: JwtPayload = {
  sub: '999888777666555444',
  role: GuildRole.ADMIN,
  type: TOKEN_TYPE.access,
};

/** Bang chúng đang đăng nhập, gắn với CHARACTER_ID. */
const MEMBER: JwtPayload = {
  sub: '123456789012345678',
  role: GuildRole.MEMBER,
  type: TOKEN_TYPE.access,
};

/** Cán bộ đang đăng nhập, cũng gắn với CHARACTER_ID. */
const LEADER: JwtPayload = {
  sub: '123456789012345678',
  role: GuildRole.LEADER,
  type: TOKEN_TYPE.access,
};

/** Id trận trong lịch giả lập, tra theo nhãn cho dễ đọc. */
const SESSION_IDS: Record<string, string> = {
  'Thứ 3 · 20:30': 'session-tue',
  'Thứ 7 · Bang Chiến': 'session-sat',
};

/** Lịch của tuần đang mở mà BattleSessionsService trả về. */
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
    hasFormation: false,
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
    hasFormation: false,
  },
];

describe('AttendanceService', () => {
  let service: AttendanceService;
  /** Dựng service với một mốc thời gian cố định — vài test cần mốc khác WEDNESDAY. */
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
    list: jest.Mock;
    exists: jest.Mock;
    findByDiscordId: jest.Mock;
    findById: jest.Mock;
  };

  /**
   * Cho `findById` trả lịch giả lập kèm cờ quá hạn dựng ở mốc `now`, đúng như
   * BattleSessionsService thật làm.
   * @param now - Mốc thời gian dùng để dựng cờ `isDeadlinePassed`
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
        upsert: jest
          .fn()
          .mockImplementation(
            (args: {
              create: { characterId: string; sessionId: string };
              update: { status: AttendanceStatus; markedAt: Date };
            }) =>
              Promise.resolve({
                characterId: args.create.characterId,
                sessionId: args.create.sessionId,
                status: args.update.status,
                markedAt: args.update.markedAt,
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
      list: jest.fn().mockResolvedValue([]),
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
          status: AttendanceStatus.PRESENT,
        },
        MEMBER,
      );

      expect(record).toEqual({
        characterId: CHARACTER_ID,
        sessionId: SESSION_IDS['Thứ 7 · Bang Chiến'],
        status: AttendanceStatus.PRESENT,
        markedAt: WEDNESDAY.toISOString(),
      });
    });

    it('cho đổi Có ⇄ Không khi còn hạn (upsert theo cặp nhân vật + trận)', async () => {
      await service.mark(
        {
          characterId: CHARACTER_ID,
          sessionId: SESSION_IDS['Thứ 7 · Bang Chiến'],
          status: AttendanceStatus.PRESENT,
        },
        MEMBER,
      );
      const changed = await service.mark(
        {
          characterId: CHARACTER_ID,
          sessionId: SESSION_IDS['Thứ 7 · Bang Chiến'],
          status: AttendanceStatus.ABSENT,
        },
        MEMBER,
      );

      expect(changed.status).toBe(AttendanceStatus.ABSENT);
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
            status: AttendanceStatus.PRESENT,
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
            status: AttendanceStatus.PRESENT,
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
            status: AttendanceStatus.PRESENT,
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
          status: AttendanceStatus.PRESENT,
        },
        ADMIN,
      );

      expect(record.status).toBe(AttendanceStatus.PRESENT);
      expect(prisma.attendanceRecord.upsert).toHaveBeenCalled();
    });

    it('quản trị viên sửa được cả trận đã quá hạn', async () => {
      const record = await service.mark(
        {
          characterId: CHARACTER_ID,
          sessionId: SESSION_IDS['Thứ 3 · 20:30'],
          status: AttendanceStatus.ABSENT,
        },
        ADMIN,
      );

      expect(record.status).toBe(AttendanceStatus.ABSENT);
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
            status: AttendanceStatus.PRESENT,
          },
          MEMBER,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('quyết định theo cờ của lịch đánh, không tự tính lại từ hạn chót', async () => {
      // Lịch nói "chưa quá hạn" trong khi hạn chót đã lùi vào quá khứ. Hai giá trị
      // này chỉ lệch được khi có hai đồng hồ — đúng thứ code cũ tạo ra. Còn một chỗ
      // đánh giá luật thì cờ thắng, nên lượt điểm danh phải đi qua.
      battleSessions.findById.mockResolvedValue({
        ...SESSIONS[0],
        isDeadlinePassed: false,
      });

      const record = await service.mark(
        {
          characterId: CHARACTER_ID,
          sessionId: SESSION_IDS['Thứ 3 · 20:30'],
          status: AttendanceStatus.PRESENT,
        },
        MEMBER,
      );

      expect(record.status).toBe(AttendanceStatus.PRESENT);
    });
  });

  describe('getCharacters', () => {
    it('cán bộ nhận cả bang, thẳng từ CharactersService', async () => {
      const roster = [
        OWN_ROW,
        { id: OTHER_CHARACTER_ID, name: 'Mèo', guildClass: GuildClass.TO_VAN },
      ];
      characters.list.mockResolvedValue(roster);

      await expect(service.getCharacters(LEADER)).resolves.toEqual(roster);
    });

    it('bang chúng chỉ nhận nhân vật của chính mình', async () => {
      await expect(service.getCharacters(MEMBER)).resolves.toEqual([OWN_ROW]);
      expect(characters.list).not.toHaveBeenCalled();
    });

    it('tài khoản chưa gắn nhân vật thì nhận danh sách rỗng', async () => {
      characters.findByDiscordId.mockResolvedValue(null);

      await expect(service.getCharacters(MEMBER)).resolves.toEqual([]);
    });
  });

  describe('điểm danh theo vai', () => {
    it('cán bộ điểm danh hộ người khác thì bị chặn', async () => {
      await expect(
        service.mark(
          {
            characterId: OTHER_CHARACTER_ID,
            sessionId: SESSION_IDS['Thứ 7 · Bang Chiến'],
            status: AttendanceStatus.PRESENT,
          },
          LEADER,
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
          status: AttendanceStatus.PRESENT,
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

    it('bang chúng chỉ đọc lượt điểm danh của chính mình', async () => {
      await service.getRecords(MEMBER);

      const [args] = prisma.attendanceRecord.findMany.mock.calls[0] as [
        { where: { characterId?: string } },
      ];
      expect(args.where.characterId).toBe(CHARACTER_ID);
    });

    it('bang chúng chưa gắn nhân vật thì không đọc được lượt nào', async () => {
      characters.findByDiscordId.mockResolvedValue(null);

      await expect(service.getRecords(MEMBER)).resolves.toEqual([]);
      expect(prisma.attendanceRecord.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getSummary', () => {
    it('đếm Có/Không theo từng trận, không kèm danh tính', async () => {
      prisma.attendanceRecord.groupBy.mockResolvedValue([
        {
          sessionId: 'session-sat',
          status: AttendanceStatus.PRESENT,
          _count: { _all: 3 },
        },
        {
          sessionId: 'session-sat',
          status: AttendanceStatus.ABSENT,
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

      await service.getRecords(LEADER);

      expect(prisma.attendanceRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sessionId: { in: ['session-tue', 'session-sat'] } },
        }),
      );
    });

    it('dựng record qua codec — markedAt ra ISO string', async () => {
      prisma.attendanceRecord.findMany.mockResolvedValue([
        {
          characterId: CHARACTER_ID,
          sessionId: 'session-sat',
          status: AttendanceStatus.PRESENT,
          markedAt: WEDNESDAY,
        },
      ]);

      await expect(service.getRecords(LEADER)).resolves.toEqual([
        {
          characterId: CHARACTER_ID,
          sessionId: 'session-sat',
          status: AttendanceStatus.PRESENT,
          markedAt: WEDNESDAY.toISOString(),
        },
      ]);
    });
  });
});
