import { BadRequestException, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { BattleSessionsService } from '../battle-sessions.service';

/**
 * Tạo Date từ giờ Việt Nam (UTC+7) cho dễ đọc trong test.
 * @param iso - Chuỗi dạng '2026-07-22T12:00' hiểu theo giờ VN
 * @returns Date UTC tương ứng
 */
function vn(iso: string): Date {
  return new Date(`${iso}:00+07:00`);
}

// Thứ 4 2026-07-22 → tuần đang mở bắt đầu Thứ 2 2026-07-20, tuần kế 2026-07-27.
const WEDNESDAY = vn('2026-07-22T12:00');
const WEEK_START = vn('2026-07-20T00:00');
const NEXT_WEEK_START = vn('2026-07-27T00:00');
const LAST_WEEK_START = vn('2026-07-13T00:00');

/**
 * Đọc tham số đầu tiên của lần gọi thứ `index` — jest.Mock không giữ kiểu nên
 * bóc qua đây một lần thay vì rải ép kiểu khắp file.
 * @param mock - Mock cần đọc
 * @param index - Lần gọi thứ mấy (tính từ 0)
 * @returns Tham số đầu tiên của lần gọi đó
 */
function firstArg(mock: jest.Mock, index: number): unknown {
  return (mock.mock.calls[index] as unknown[])[0];
}

/**
 * Dựng một hàng BattleSession như Prisma trả về (kèm `_count`).
 * @param overrides - Các field muốn ghi đè
 * @returns Hàng BattleSession giả lập
 */
function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'session-tue',
    dateTime: vn('2026-07-21T20:30'),
    deadline: vn('2026-07-21T10:00'),
    opponent: 'Hắc Long Đường',
    isGuildWar: false,
    weekStart: WEEK_START,
    _count: { attendanceRecords: 0, formationMatches: 0 },
    ...overrides,
  };
}

describe('BattleSessionsService', () => {
  let service: BattleSessionsService;
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

    service = new BattleSessionsService(prisma as unknown as PrismaService);
  });

  describe('ensureGuildWar qua listByWeek', () => {
    it('upsert theo id tất định nên gọi nhiều lần vẫn một trận', async () => {
      await service.listByWeek(undefined, WEDNESDAY);
      await service.listByWeek(undefined, WEDNESDAY);

      expect(prisma.battleSession.upsert).toHaveBeenCalledTimes(2);
      expect(firstArg(prisma.battleSession.upsert, 0)).toMatchObject({
        where: { id: 'gw-2026-07-20' },
      });
    });

    it('ghi đè hạn chót 17:00 Thứ 5 cả khi tạo lẫn khi hàng đã tồn tại', async () => {
      await service.listByWeek(undefined, WEDNESDAY);

      expect(firstArg(prisma.battleSession.upsert, 0)).toMatchObject({
        create: { deadline: vn('2026-07-23T17:00') },
        update: { deadline: vn('2026-07-23T17:00') },
      });
    });

    it('không tự sinh trận cho tuần đã qua', async () => {
      await service.listByWeek(LAST_WEEK_START.toISOString(), WEDNESDAY);

      expect(prisma.battleSession.upsert).not.toHaveBeenCalled();
    });
  });

  describe('ensureWeekMaterialized', () => {
    it('gọi hai lần cho cùng tuần chỉ upsert theo một id, không sinh trận trùng', async () => {
      await service.ensureWeekMaterialized(WEEK_START.toISOString(), WEDNESDAY);
      await service.ensureWeekMaterialized(WEEK_START.toISOString(), WEDNESDAY);

      // Cùng id ở cả `where` lẫn `create` nên lần gọi thứ hai rơi vào nhánh
      // update của cùng một hàng, không thể sinh trận thứ hai.
      expect(firstArg(prisma.battleSession.upsert, 0)).toMatchObject({
        where: { id: 'gw-2026-07-20' },
        create: { id: 'gw-2026-07-20' },
      });
      expect(firstArg(prisma.battleSession.upsert, 1)).toEqual(
        firstArg(prisma.battleSession.upsert, 0),
      );
    });

    it('tuần đã qua là no-op', async () => {
      await service.ensureWeekMaterialized(
        LAST_WEEK_START.toISOString(),
        WEDNESDAY,
      );

      expect(prisma.battleSession.upsert).not.toHaveBeenCalled();
    });
  });

  describe('readWeekSessions', () => {
    it('trả về nhãn đã dựng và không tự sinh trận', async () => {
      const sessions = await service.readWeekSessions(WEEK_START.toISOString());

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
    it('trả về mốc tuần dạng ISO string, mới nhất trước', async () => {
      prisma.battleSession.findMany.mockResolvedValue([
        { weekStart: NEXT_WEEK_START },
        { weekStart: WEEK_START },
      ]);

      const anchors = await service.listWeekAnchors();

      expect(anchors).toEqual([
        NEXT_WEEK_START.toISOString(),
        WEEK_START.toISOString(),
      ]);
    });
  });

  describe('create', () => {
    it('tạo được trận cho tuần đang mở và tuần kế tiếp', async () => {
      await service.create(
        {
          dateTime: vn('2026-07-21T20:30').toISOString(),
          deadline: vn('2026-07-21T10:00').toISOString(),
          opponent: 'Hắc Long Đường',
        },
        WEDNESDAY,
      );

      expect(firstArg(prisma.battleSession.create, 0)).toMatchObject({
        data: { weekStart: WEEK_START, opponent: 'Hắc Long Đường' },
      });

      await service.create(
        {
          dateTime: vn('2026-07-28T20:30').toISOString(),
          deadline: vn('2026-07-28T10:00').toISOString(),
        },
        WEDNESDAY,
      );

      expect(firstArg(prisma.battleSession.create, 1)).toMatchObject({
        data: { weekStart: NEXT_WEEK_START },
      });
    });

    it('từ chối trận thuộc tuần đã qua', async () => {
      await expect(
        service.create(
          {
            dateTime: vn('2026-07-14T20:30').toISOString(),
            deadline: vn('2026-07-14T10:00').toISOString(),
          },
          WEDNESDAY,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('từ chối hạn chót muộn hơn 10:00 sáng ngày đánh', async () => {
      await expect(
        service.create(
          {
            dateTime: vn('2026-07-21T20:30').toISOString(),
            deadline: vn('2026-07-21T17:00').toISOString(),
          },
          WEDNESDAY,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('chấp nhận hạn chót đúng bằng trần', async () => {
      await service.create(
        {
          dateTime: vn('2026-07-21T20:30').toISOString(),
          deadline: vn('2026-07-21T10:00').toISOString(),
        },
        WEDNESDAY,
      );

      expect(prisma.battleSession.create).toHaveBeenCalled();
    });

    it('trận trước 10:00 lấy giờ đánh làm trần', async () => {
      await expect(
        service.create(
          {
            dateTime: vn('2026-07-21T08:00').toISOString(),
            deadline: vn('2026-07-21T09:00').toISOString(),
          },
          WEDNESDAY,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('quy tên bang rỗng về null', async () => {
      await service.create(
        {
          dateTime: vn('2026-07-21T20:30').toISOString(),
          deadline: vn('2026-07-21T10:00').toISOString(),
          opponent: '',
        },
        WEDNESDAY,
      );

      expect(firstArg(prisma.battleSession.create, 0)).toMatchObject({
        data: { opponent: null },
      });
    });
  });

  describe('update', () => {
    it('báo 404 khi trận không còn tồn tại', async () => {
      prisma.battleSession.findUnique.mockResolvedValue(null);

      await expect(
        service.update('mat-roi', { opponent: 'Ai đó' }, WEDNESDAY),
      ).rejects.toThrow(NotFoundException);
    });

    it('từ chối đặt đối thủ cho Guild War', async () => {
      prisma.battleSession.findUnique.mockResolvedValue(
        row({ id: 'gw-2026-07-20', isGuildWar: true, opponent: null }),
      );

      await expect(
        service.update('gw-2026-07-20', { opponent: 'Ai đó' }, WEDNESDAY),
      ).rejects.toThrow(BadRequestException);
    });

    it('từ chối sửa hạn chót của Guild War', async () => {
      prisma.battleSession.findUnique.mockResolvedValue(
        row({ id: 'gw-2026-07-20', isGuildWar: true, opponent: null }),
      );

      await expect(
        service.update(
          'gw-2026-07-20',
          { deadline: vn('2026-07-23T10:00').toISOString() },
          WEDNESDAY,
        ),
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

      await service.update(
        'gw-2026-07-20',
        { dateTime: vn('2026-08-01T20:00').toISOString() },
        WEDNESDAY,
      );

      expect(firstArg(prisma.battleSession.update, 0)).toMatchObject({
        data: {
          weekStart: NEXT_WEEK_START,
          deadline: vn('2026-07-30T17:00'),
        },
      });
    });

    it('từ chối khi dời giờ đánh khiến hạn chót cũ vượt trần', async () => {
      // Hàng cũ theo luật trước đây: trận Thứ 5 với hạn chót 17:00 Thứ 5.
      prisma.battleSession.findUnique.mockResolvedValue(
        row({
          dateTime: vn('2026-07-23T20:30'),
          deadline: vn('2026-07-23T17:00'),
        }),
      );

      await expect(
        service.update(
          'session-tue',
          { dateTime: vn('2026-07-21T20:30').toISOString() },
          WEDNESDAY,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('dời trận sang tuần khác thì cập nhật weekStart', async () => {
      await service.update(
        'session-tue',
        { dateTime: vn('2026-07-28T20:30').toISOString() },
        WEDNESDAY,
      );

      expect(firstArg(prisma.battleSession.update, 0)).toMatchObject({
        where: { id: 'session-tue' },
        data: { weekStart: NEXT_WEEK_START },
      });
    });

    it('hasFormation bật khi ngày đánh đã có ít nhất một trận được xếp', async () => {
      prisma.battleSession.findMany.mockResolvedValue([
        row({ _count: { attendanceRecords: 3, formationMatches: 2 } }),
      ]);

      const [session] = await service.listByWeek(
        WEEK_START.toISOString(),
        WEDNESDAY,
      );

      expect(session.hasFormation).toBe(true);
    });

    it('isDeadlinePassed theo thời điểm dựng response', async () => {
      prisma.battleSession.findMany.mockResolvedValue([
        row({ deadline: vn('2026-07-21T10:00') }),
      ]);

      const [before] = await service.listByWeek(
        WEEK_START.toISOString(),
        vn('2026-07-21T09:00'),
      );
      const [after] = await service.listByWeek(
        WEEK_START.toISOString(),
        vn('2026-07-21T11:00'),
      );

      expect(before.isDeadlinePassed).toBe(false);
      expect(after.isDeadlinePassed).toBe(true);
    });

    it('từ chối sửa trận thuộc tuần đã qua', async () => {
      prisma.battleSession.findUnique.mockResolvedValue(
        row({ weekStart: LAST_WEEK_START, dateTime: vn('2026-07-14T20:30') }),
      );

      await expect(
        service.update('session-tue', { opponent: 'Ai đó' }, WEDNESDAY),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('xoá được scrim của tuần đang mở', async () => {
      await service.remove('session-tue', WEDNESDAY);

      expect(prisma.battleSession.delete).toHaveBeenCalledWith({
        where: { id: 'session-tue' },
      });
    });

    it('không cho xoá Guild War', async () => {
      prisma.battleSession.findUnique.mockResolvedValue(
        row({ id: 'gw-2026-07-20', isGuildWar: true }),
      );

      await expect(service.remove('gw-2026-07-20', WEDNESDAY)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('không cho xoá trận thuộc tuần đã qua', async () => {
      prisma.battleSession.findUnique.mockResolvedValue(
        row({ weekStart: LAST_WEEK_START }),
      );

      await expect(service.remove('session-tue', WEDNESDAY)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
