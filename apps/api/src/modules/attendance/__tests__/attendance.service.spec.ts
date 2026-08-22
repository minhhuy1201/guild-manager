import { ConflictException, NotFoundException } from '@nestjs/common';
import { AttendanceStatus } from '@guild/shared/enums';

import {
  ADMIN_ROLE,
  FixedClock,
  TOKEN_TYPE,
  type JwtPayload,
} from '../../../common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { BattleSessionsService } from '../../battle-sessions/battle-sessions.public';
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

describe('AttendanceService.mark', () => {
  let service: AttendanceService;
  /** Dựng service với một mốc thời gian cố định — vài test cần mốc khác WEDNESDAY. */
  let makeService: (now: Date) => AttendanceService;
  let prisma: {
    character: { findUnique: jest.Mock };
    attendanceRecord: { upsert: jest.Mock; findMany: jest.Mock };
  };
  let battleSessions: {
    listByWeek: jest.Mock;
    findById: jest.Mock;
    getActiveWeekStart: jest.Mock;
  };

  beforeEach(() => {
    makeService = (now: Date) => {
      battleSessions.findById.mockImplementation((id: string) => {
        const found = SESSIONS.find((item) => item.id === id);

        return Promise.resolve(
          found
            ? {
                ...found,
                // Cờ do BattleSessionsService dựng ở cùng mốc thời gian này —
                // AttendanceService dùng lại chứ không tính lại.
                isDeadlinePassed:
                  now.getTime() > new Date(found.deadline).getTime(),
              }
            : null,
        );
      });

      return new AttendanceService(
        prisma as unknown as PrismaService,
        battleSessions as unknown as BattleSessionsService,
        new FixedClock(now),
      );
    };

    prisma = {
      character: {
        findUnique: jest.fn().mockResolvedValue({ id: CHARACTER_ID }),
      },
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

    service = makeService(WEDNESDAY);
  });

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
    prisma.character.findUnique.mockResolvedValue(null);

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
    await expect(
      makeService(vn('2026-07-23T17:01')).mark(
        {
          characterId: CHARACTER_ID,
          sessionId: SESSION_IDS['Thứ 7 · Guild War'],
          status: AttendanceStatus.PRESENT,
        },
        null,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('trận vừa qua hạn: cờ trả về client và cờ chặn ghi là cùng một mốc', async () => {
    // Một phút sau hạn 17:00 Thứ 5 của Guild War — mốc mà trước đây hai đồng hồ
    // khác nhau có thể cho hai câu trả lời khác nhau.
    const justPast = makeService(vn('2026-07-23T17:01'));
    const sessionId = SESSION_IDS['Thứ 7 · Guild War'];

    await expect(
      justPast.mark(
        {
          characterId: CHARACTER_ID,
          sessionId,
          status: AttendanceStatus.PRESENT,
        },
        null,
      ),
    ).rejects.toThrow(ConflictException);

    const session = (await battleSessions.findById(sessionId)) as {
      isDeadlinePassed: boolean;
    };
    expect(session.isDeadlinePassed).toBe(true);
  });
});
