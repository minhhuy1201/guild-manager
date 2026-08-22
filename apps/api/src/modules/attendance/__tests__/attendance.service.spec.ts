import { ConflictException, NotFoundException } from '@nestjs/common';
import { AttendanceStatus, GuildClass } from '@guild/shared/enums';

import {
  ADMIN_ROLE,
  FixedClock,
  TOKEN_TYPE,
  type JwtPayload,
} from '../../../common';
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

/** Quản trị viên đang đăng nhập — sửa được cả trận đã quá hạn. */
const ADMIN: JwtPayload = {
  sub: 'huy',
  role: ADMIN_ROLE,
  type: TOKEN_TYPE.access,
};

/** Id trận trong lịch giả lập, tra theo nhãn cho dễ đọc. */
const SESSION_IDS: Record<string, string> = {
  'Thứ 3 · 20:30': 'session-tue',
  'Thứ 7 · Guild War': 'session-sat',
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
    label: 'Thứ 7 · Guild War',
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
    attendanceRecord: { upsert: jest.Mock; findMany: jest.Mock };
  };
  let battleSessions: {
    listByWeek: jest.Mock;
    findById: jest.Mock;
    getActiveWeekStart: jest.Mock;
  };
  let characters: { list: jest.Mock; exists: jest.Mock };

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
      },
    };

    battleSessions = {
      listByWeek: jest.fn().mockResolvedValue(SESSIONS),
      findById: jest.fn(),
      getActiveWeekStart: jest
        .fn()
        .mockReturnValue(vn('2026-07-20T00:00').toISOString()),
    };

    characters = {
      list: jest.fn().mockResolvedValue([]),
      exists: jest.fn().mockResolvedValue(true),
    };

    stubSchedule(WEDNESDAY);
    service = makeService(WEDNESDAY);
  });

  describe('mark', () => {
    it('ghi nhận điểm danh khi còn hạn', async () => {
      const record = await service.mark(
        {
          characterId: CHARACTER_ID,
          sessionId: SESSION_IDS['Thứ 7 · Guild War'],
          status: AttendanceStatus.PRESENT,
        },
        null,
      );

      expect(record).toEqual({
        characterId: CHARACTER_ID,
        sessionId: SESSION_IDS['Thứ 7 · Guild War'],
        status: AttendanceStatus.PRESENT,
        markedAt: WEDNESDAY.toISOString(),
      });
    });

    it('cho đổi Có ⇄ Không khi còn hạn (upsert theo cặp nhân vật + trận)', async () => {
      await service.mark(
        {
          characterId: CHARACTER_ID,
          sessionId: SESSION_IDS['Thứ 7 · Guild War'],
          status: AttendanceStatus.PRESENT,
        },
        null,
      );
      const changed = await service.mark(
        {
          characterId: CHARACTER_ID,
          sessionId: SESSION_IDS['Thứ 7 · Guild War'],
          status: AttendanceStatus.ABSENT,
        },
        null,
      );

      expect(changed.status).toBe(AttendanceStatus.ABSENT);
      expect(prisma.attendanceRecord.upsert).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: {
            characterId_sessionId: {
              characterId: CHARACTER_ID,
              sessionId: SESSION_IDS['Thứ 7 · Guild War'],
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
            sessionId: SESSION_IDS['Thứ 7 · Guild War'],
            status: AttendanceStatus.PRESENT,
          },
          null,
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
          null,
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
          null,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('quản trị viên điểm danh hộ được', async () => {
      const record = await service.mark(
        {
          characterId: CHARACTER_ID,
          sessionId: SESSION_IDS['Thứ 7 · Guild War'],
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
            sessionId: SESSION_IDS['Thứ 7 · Guild War'],
            status: AttendanceStatus.PRESENT,
          },
          null,
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
        null,
      );

      expect(record.status).toBe(AttendanceStatus.PRESENT);
    });
  });

  describe('getCharacters', () => {
    it('trả thẳng danh sách của CharactersService, không tự truy vấn bảng', async () => {
      const roster = [
        { id: CHARACTER_ID, name: 'Huy', guildClass: GuildClass.THIET_Y },
      ];
      characters.list.mockResolvedValue(roster);

      await expect(service.getCharacters()).resolves.toEqual(roster);
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

    it('dựng record qua codec — markedAt ra ISO string', async () => {
      prisma.attendanceRecord.findMany.mockResolvedValue([
        {
          characterId: CHARACTER_ID,
          sessionId: 'session-sat',
          status: AttendanceStatus.PRESENT,
          markedAt: WEDNESDAY,
        },
      ]);

      await expect(service.getRecords()).resolves.toEqual([
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
