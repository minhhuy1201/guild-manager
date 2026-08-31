import { BadRequestException, NotFoundException } from '@nestjs/common';

import { FixedClock } from '../../../common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { BattleSessionsService } from '../battle-sessions.service';
import { getEditableWeeks, weekStartOf } from '../session-schedule';

/**
 * Build a Date from Vietnam time (UTC+7) for readability in tests.
 * @param iso - A string like '2026-07-22T12:00', read as Vietnam time
 * @returns The matching UTC Date
 */
function vn(iso: string): Date {
  return new Date(`${iso}:00+07:00`);
}

// Wednesday 2026-07-22 → the open week starts Monday 2026-07-20, the next one 2026-07-27.
const WEDNESDAY = vn('2026-07-22T12:00');
const WEEK_START = weekStartOf(vn('2026-07-20T00:00'));
const NEXT_WEEK_START = weekStartOf(vn('2026-07-27T00:00'));
const LAST_WEEK_START = weekStartOf(vn('2026-07-13T00:00'));

/**
 * Read the first argument of call number `index` — jest.Mock loses the types, so unwrap once here
 * instead of scattering casts across the file.
 * @param mock - Mock to inspect
 * @param index - Which call (0-based)
 * @returns The first argument of that call
 */
function firstArg(mock: jest.Mock, index: number): unknown {
  return (mock.mock.calls[index] as unknown[])[0];
}

/**
 * Build a BattleSession row as Prisma returns it (with `_count`).
 * @param overrides - Fields to override
 * @returns The fake BattleSession row
 */
function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'session-tue',
    dateTime: vn('2026-07-21T20:30'),
    deadline: vn('2026-07-21T10:00'),
    opponent: 'Hắc Long Đường',
    isGuildWar: false,
    matchCount: 2,
    weekStart: WEEK_START,
    _count: { attendanceRecords: 0, formationMatches: 0 },
    ...overrides,
  };
}

describe('BattleSessionsService', () => {
  let service: BattleSessionsService;
  /** Build the service with a fixed clock — a few tests need a moment other than WEDNESDAY. */
  let makeService: (now: Date) => BattleSessionsService;
  let prisma: {
    battleSession: {
      upsert: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      battleSession: {
        upsert: jest.fn().mockResolvedValue(row()),
        findMany: jest.fn().mockResolvedValue([row()]),
        findUnique: jest.fn().mockResolvedValue(row()),
        create: jest.fn().mockImplementation(() => Promise.resolve(row())),
        update: jest.fn().mockImplementation(() => Promise.resolve(row())),
        delete: jest.fn().mockResolvedValue(row()),
      },
      $transaction: jest
        .fn()
        .mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma)),
    };

    makeService = (now: Date) =>
      new BattleSessionsService(
        prisma as unknown as PrismaService,
        new FixedClock(now),
      );
    service = makeService(WEDNESDAY);
  });

  describe('ensureGuildWar qua listByWeek', () => {
    it('upsert theo id tất định nên gọi nhiều lần vẫn một trận', async () => {
      await service.listByWeek();
      await service.listByWeek();

      expect(prisma.battleSession.upsert).toHaveBeenCalledTimes(2);
      expect(firstArg(prisma.battleSession.upsert, 0)).toMatchObject({
        where: { id: 'gw-2026-07-20' },
      });
    });

    it('ghi đè hạn chót 17:00 Thứ 5 cả khi tạo lẫn khi hàng đã tồn tại', async () => {
      await service.listByWeek();

      expect(firstArg(prisma.battleSession.upsert, 0)).toMatchObject({
        create: { deadline: vn('2026-07-23T17:00') },
        update: { deadline: vn('2026-07-23T17:00') },
      });
    });

    it('không tự sinh trận cho tuần đã qua', async () => {
      await service.listByWeek(LAST_WEEK_START.toISOString());

      expect(prisma.battleSession.upsert).not.toHaveBeenCalled();
    });
  });

  describe('listByWeek nhận mốc tuần từ query', () => {
    // Returning 400 to the user is `weekStartQuerySchema`'s job at the HTTP boundary; the service
    // layer only has to throw immediately instead of letting `Invalid Date` reach Prisma.
    it('chuỗi hỏng thì ném ngay, không rơi xuống Prisma', async () => {
      await expect(service.listByWeek('xyz')).rejects.toThrow(RangeError);
      expect(prisma.battleSession.findMany).not.toHaveBeenCalled();
    });

    it('mốc giữa tuần quy về Thứ 2 trước khi truy vấn', async () => {
      await service.listByWeek(vn('2026-07-22T12:00').toISOString());

      expect(firstArg(prisma.battleSession.findMany, 0)).toMatchObject({
        where: { weekStart: WEEK_START },
      });
    });

    it('bỏ trống thì đọc tuần đang mở', async () => {
      await service.listByWeek();

      expect(firstArg(prisma.battleSession.findMany, 0)).toMatchObject({
        where: { weekStart: WEEK_START },
      });
    });

    it('getActiveWeek trả mốc Thứ 2 của tuần đang mở', () => {
      expect(service.getActiveWeek().toISOString()).toBe(
        WEEK_START.toISOString(),
      );
    });

    it('getCurrentWeek trả tuần đang mở, không cần danh sách tuần sửa được', () => {
      expect(service.getCurrentWeek()).toEqual({
        weekStart: WEEK_START.toISOString(),
        weekEnd: getEditableWeeks(WEDNESDAY)[0].weekEnd.toISOString(),
        isActive: true,
      });
    });
  });

  describe('ensureWeekMaterialized', () => {
    it('gọi hai lần cho cùng tuần chỉ upsert theo một id, không sinh trận trùng', async () => {
      await service.ensureWeekMaterialized(WEEK_START);
      await service.ensureWeekMaterialized(WEEK_START);

      // The same id in both `where` and `create`, so the second call lands on the update branch of
      // the same row and cannot produce a second session.
      expect(firstArg(prisma.battleSession.upsert, 0)).toMatchObject({
        where: { id: 'gw-2026-07-20' },
        create: { id: 'gw-2026-07-20' },
      });
      expect(firstArg(prisma.battleSession.upsert, 1)).toEqual(
        firstArg(prisma.battleSession.upsert, 0),
      );
    });

    it('tuần đã qua là no-op', async () => {
      await service.ensureWeekMaterialized(LAST_WEEK_START);

      expect(prisma.battleSession.upsert).not.toHaveBeenCalled();
    });
  });

  describe('readWeekSessions', () => {
    it('trả về nhãn đã dựng và không tự sinh trận', async () => {
      const sessions = await service.readWeekSessions(WEEK_START);

      expect(prisma.battleSession.upsert).not.toHaveBeenCalled();
      expect(sessions).toEqual([
        {
          id: 'session-tue',
          label: 'Thứ 3 · 20:30',
          dateTime: vn('2026-07-21T20:30'),
          isGuildWar: false,
          opponent: 'Hắc Long Đường',
        },
      ]);
    });
  });

  describe('listWeekAnchors', () => {
    it('trả về mốc tuần có kiểu, mới nhất trước', async () => {
      prisma.battleSession.findMany.mockResolvedValue([
        { weekStart: NEXT_WEEK_START },
        { weekStart: WEEK_START },
      ]);

      const anchors = await service.listWeekAnchors();

      expect(anchors).toEqual([NEXT_WEEK_START, WEEK_START]);
    });
  });

  describe('create', () => {
    it('tạo được trận cho tuần đang mở và tuần kế tiếp', async () => {
      await service.create({
        dateTime: vn('2026-07-21T20:30').toISOString(),
        deadline: vn('2026-07-21T10:00').toISOString(),
        matchCount: 2,
        opponent: 'Hắc Long Đường',
      });

      expect(firstArg(prisma.battleSession.create, 0)).toMatchObject({
        data: { weekStart: WEEK_START, opponent: 'Hắc Long Đường' },
      });

      await service.create({
        dateTime: vn('2026-07-28T20:30').toISOString(),
        deadline: vn('2026-07-28T10:00').toISOString(),
        matchCount: 2,
      });

      expect(firstArg(prisma.battleSession.create, 1)).toMatchObject({
        data: { weekStart: NEXT_WEEK_START },
      });
    });

    it('từ chối trận thuộc tuần đã qua', async () => {
      await expect(
        service.create({
          dateTime: vn('2026-07-14T20:30').toISOString(),
          deadline: vn('2026-07-14T10:00').toISOString(),
          matchCount: 2,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('từ chối hạn chót muộn hơn 10:00 sáng ngày đánh', async () => {
      await expect(
        service.create({
          dateTime: vn('2026-07-21T20:30').toISOString(),
          deadline: vn('2026-07-21T17:00').toISOString(),
          matchCount: 2,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('chấp nhận hạn chót đúng bằng trần', async () => {
      await service.create({
        dateTime: vn('2026-07-21T20:30').toISOString(),
        deadline: vn('2026-07-21T10:00').toISOString(),
        matchCount: 2,
      });

      expect(prisma.battleSession.create).toHaveBeenCalled();
    });

    it('trận trước 10:00 lấy giờ đánh làm trần', async () => {
      await expect(
        service.create({
          dateTime: vn('2026-07-21T08:00').toISOString(),
          deadline: vn('2026-07-21T09:00').toISOString(),
          matchCount: 2,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('quy tên bang rỗng về null', async () => {
      await service.create({
        dateTime: vn('2026-07-21T20:30').toISOString(),
        deadline: vn('2026-07-21T10:00').toISOString(),
        matchCount: 2,
        opponent: '',
      });

      expect(firstArg(prisma.battleSession.create, 0)).toMatchObject({
        data: { opponent: null },
      });
    });
  });

  describe('update', () => {
    it('báo 404 khi trận không còn tồn tại', async () => {
      prisma.battleSession.findUnique.mockResolvedValue(null);

      await expect(
        service.update('mat-roi', { opponent: 'Ai đó' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('từ chối đặt đối thủ cho Guild War', async () => {
      prisma.battleSession.findUnique.mockResolvedValue(
        row({ id: 'gw-2026-07-20', isGuildWar: true, opponent: null }),
      );

      await expect(
        service.update('gw-2026-07-20', { opponent: 'Ai đó' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('từ chối sửa hạn chót của Guild War', async () => {
      prisma.battleSession.findUnique.mockResolvedValue(
        row({ id: 'gw-2026-07-20', isGuildWar: true, opponent: null }),
      );

      await expect(
        service.update('gw-2026-07-20', {
          deadline: vn('2026-07-23T10:00').toISOString(),
          matchCount: 2,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('dời Guild War sang tuần khác thì hạn chót tính lại theo tuần mới', async () => {
      prisma.battleSession.findUnique.mockResolvedValue(
        row({
          id: 'gw-2026-07-20',
          isGuildWar: true,
          opponent: null,
          dateTime: vn('2026-07-25T20:00'),
          deadline: vn('2026-07-23T17:00'),
        }),
      );

      await service.update('gw-2026-07-20', {
        dateTime: vn('2026-08-01T20:00').toISOString(),
      });

      expect(firstArg(prisma.battleSession.update, 0)).toMatchObject({
        data: {
          weekStart: NEXT_WEEK_START,
          deadline: vn('2026-07-30T17:00'),
        },
      });
    });

    it('từ chối khi dời giờ đánh khiến hạn chót cũ vượt trần', async () => {
      // A legacy row under the previous rule: a Thursday session with a 17:00 Thursday deadline.
      prisma.battleSession.findUnique.mockResolvedValue(
        row({
          dateTime: vn('2026-07-23T20:30'),
          deadline: vn('2026-07-23T17:00'),
        }),
      );

      await expect(
        service.update('session-tue', {
          dateTime: vn('2026-07-21T20:30').toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('dời trận sang tuần khác thì cập nhật weekStart', async () => {
      await service.update('session-tue', {
        dateTime: vn('2026-07-28T20:30').toISOString(),
      });

      expect(firstArg(prisma.battleSession.update, 0)).toMatchObject({
        where: { id: 'session-tue' },
        data: { weekStart: NEXT_WEEK_START },
      });
    });

    it('formationMatchCount đếm số đội hình đã xếp cho ngày đánh', async () => {
      prisma.battleSession.findMany.mockResolvedValue([
        row({ _count: { attendanceRecords: 3, formationMatches: 2 } }),
      ]);

      const [session] = await service.listByWeek(WEEK_START.toISOString());

      expect(session.formationMatchCount).toBe(2);
    });

    it('isDeadlinePassed theo thời điểm dựng response', async () => {
      prisma.battleSession.findMany.mockResolvedValue([
        row({ deadline: vn('2026-07-21T10:00') }),
      ]);

      const [before] = await makeService(vn('2026-07-21T09:00')).listByWeek(
        WEEK_START.toISOString(),
      );
      const [after] = await makeService(vn('2026-07-21T11:00')).listByWeek(
        WEEK_START.toISOString(),
      );

      expect(before.isDeadlinePassed).toBe(false);
      expect(after.isDeadlinePassed).toBe(true);
    });

    it('từ chối sửa trận thuộc tuần đã qua', async () => {
      prisma.battleSession.findUnique.mockResolvedValue(
        row({ weekStart: LAST_WEEK_START, dateTime: vn('2026-07-14T20:30') }),
      );

      await expect(
        service.update('session-tue', { opponent: 'Ai đó' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('xoá được scrim của tuần đang mở', async () => {
      await service.remove('session-tue');

      expect(prisma.battleSession.delete).toHaveBeenCalledWith({
        where: { id: 'session-tue' },
      });
    });

    it('không cho xoá Guild War', async () => {
      prisma.battleSession.findUnique.mockResolvedValue(
        row({ id: 'gw-2026-07-20', isGuildWar: true }),
      );

      await expect(service.remove('gw-2026-07-20')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('không cho xoá trận thuộc tuần đã qua', async () => {
      prisma.battleSession.findUnique.mockResolvedValue(
        row({ weekStart: LAST_WEEK_START }),
      );

      await expect(service.remove('session-tue')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
