import { ConflictException, NotFoundException } from '@nestjs/common';

import { AttendanceService } from '@/modules/attendance/attendance.module';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { TeamBuilderService } from '../team-builder.service';

/**
 * Tạo Date từ giờ Việt Nam (UTC+7) cho dễ đọc trong test.
 * @param iso - Chuỗi dạng '2026-07-22T12:00' hiểu theo giờ VN
 * @returns Date UTC tương ứng
 */
function vn(iso: string): Date {
  return new Date(`${iso}:00+07:00`);
}

// Thứ 4 — trận Thứ 3 đã đánh xong, Thứ 5 và Thứ 7 còn ở tương lai.
const WEDNESDAY = vn('2026-07-22T12:00');
const WEEK_START = vn('2026-07-20T00:00');

const SESSION_ROWS = [
  {
    id: 'session-tue',
    label: 'Thứ 3 · 20:30',
    dateTime: vn('2026-07-21T20:30'),
    deadline: vn('2026-07-21T10:00'),
    isGuildWar: false,
    weekStart: WEEK_START,
  },
  {
    id: 'session-thu',
    label: 'Thứ 5 · 20:30',
    dateTime: vn('2026-07-23T20:30'),
    deadline: vn('2026-07-23T17:00'),
    isGuildWar: false,
    weekStart: WEEK_START,
  },
  {
    id: 'session-sat',
    label: 'Thứ 7 · Guild War',
    dateTime: vn('2026-07-25T20:00'),
    deadline: vn('2026-07-23T17:00'),
    isGuildWar: true,
    weekStart: WEEK_START,
  },
];

describe('TeamBuilderService.getFormations', () => {
  let service: TeamBuilderService;
  let prisma: {
    character: { findMany: jest.Mock };
    battleSession: { findMany: jest.Mock };
    formation: {
      findMany: jest.Mock;
      deleteMany: jest.Mock;
      upsert: jest.Mock;
      findUnique: jest.Mock;
    };
  };
  let attendance: {
    getCurrentWeek: jest.Mock;
    getSessions: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      character: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'char-1' }, { id: 'char-2' }]),
      },
      battleSession: { findMany: jest.fn().mockResolvedValue(SESSION_ROWS) },
      formation: {
        findMany: jest.fn().mockResolvedValue([
          {
            sessionId: 'session-sat',
            weekStart: WEEK_START,
            assignment: {
              'team-1-pos-1': 'char-1',
              'team-1-pos-2': 'char-2',
              // char-99 đã bị xoá khỏi bang — phải bị loại khi đọc.
              'team-1-pos-3': 'char-99',
            },
          },
        ]),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        upsert: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    attendance = {
      getCurrentWeek: jest.fn().mockReturnValue({
        fromDate: WEEK_START.toISOString(),
        toDate: vn('2026-07-26T00:00').toISOString(),
      }),
      getSessions: jest.fn().mockResolvedValue([]),
    };

    service = new TeamBuilderService(
      prisma as unknown as PrismaService,
      attendance as unknown as AttendanceService,
    );
  });

  it('trả về đủ 3 trận của tuần, sắp theo thời gian đánh', async () => {
    const result = await service.getFormations(undefined, WEDNESDAY);

    expect(result.map((item) => item.sessionId)).toEqual([
      'session-tue',
      'session-thu',
      'session-sat',
    ]);
  });

  it('trận chưa xếp thì assignment rỗng', async () => {
    const result = await service.getFormations(undefined, WEDNESDAY);
    const tuesday = result.find((item) => item.sessionId === 'session-tue');

    expect(tuesday?.assignment).toEqual({});
  });

  it('khoá trận đã qua giờ đánh, mở trận còn ở tương lai', async () => {
    const result = await service.getFormations(undefined, WEDNESDAY);

    expect(result.find((i) => i.sessionId === 'session-tue')?.locked).toBe(
      true,
    );
    expect(result.find((i) => i.sessionId === 'session-thu')?.locked).toBe(
      false,
    );
  });

  it('bỏ characterId không còn trong bảng Character', async () => {
    const result = await service.getFormations(undefined, WEDNESDAY);
    const saturday = result.find((item) => item.sessionId === 'session-sat');

    expect(saturday?.assignment).toEqual({
      'team-1-pos-1': 'char-1',
      'team-1-pos-2': 'char-2',
    });
  });

  it('đảm bảo trận của tuần đang mở tồn tại trước khi đọc', async () => {
    await service.getFormations(undefined, WEDNESDAY);

    expect(attendance.getSessions).toHaveBeenCalled();
  });
});

describe('TeamBuilderService.getWeeks', () => {
  let service: TeamBuilderService;
  let prisma: {
    character: { findMany: jest.Mock };
    battleSession: { findMany: jest.Mock };
    formation: { deleteMany: jest.Mock };
  };
  let attendance: { getCurrentWeek: jest.Mock; getSessions: jest.Mock };

  beforeEach(() => {
    prisma = {
      character: { findMany: jest.fn().mockResolvedValue([]) },
      battleSession: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { weekStart: WEEK_START },
            { weekStart: vn('2026-07-13T00:00') },
          ]),
      },
      formation: { deleteMany: jest.fn().mockResolvedValue({ count: 2 }) },
    };
    attendance = {
      getCurrentWeek: jest.fn().mockReturnValue({
        fromDate: WEEK_START.toISOString(),
        toDate: vn('2026-07-26T00:00').toISOString(),
      }),
      getSessions: jest.fn().mockResolvedValue([]),
    };

    service = new TeamBuilderService(
      prisma as unknown as PrismaService,
      attendance as unknown as AttendanceService,
    );
  });

  it('trả về các tuần có dữ liệu, mới nhất trước', async () => {
    const weeks = await service.getWeeks(WEDNESDAY);

    expect(weeks).toEqual([
      { weekStart: WEEK_START.toISOString() },
      { weekStart: vn('2026-07-13T00:00').toISOString() },
    ]);
  });

  it('xoá đội hình có weekStart cũ hơn 28 ngày trước khi đọc', async () => {
    await service.getWeeks(WEDNESDAY);

    expect(prisma.formation.deleteMany).toHaveBeenCalledWith({
      where: { weekStart: { lt: vn('2026-06-24T12:00') } },
    });
  });

  it('dọn dữ liệu chạy trước khi liệt kê tuần', async () => {
    const order: string[] = [];
    prisma.formation.deleteMany.mockImplementation(() => {
      order.push('delete');
      return Promise.resolve({ count: 0 });
    });
    prisma.battleSession.findMany.mockImplementation(() => {
      order.push('read');
      return Promise.resolve([]);
    });

    await service.getWeeks(WEDNESDAY);

    expect(order).toEqual(['delete', 'read']);
  });
});

describe('TeamBuilderService.saveFormation', () => {
  let service: TeamBuilderService;
  let prisma: {
    character: { findMany: jest.Mock };
    battleSession: { findUnique: jest.Mock };
    formation: { upsert: jest.Mock };
  };
  let attendance: { getCurrentWeek: jest.Mock; getSessions: jest.Mock };

  beforeEach(() => {
    prisma = {
      character: {
        findMany: jest.fn().mockResolvedValue([{ id: 'char-1' }]),
      },
      battleSession: {
        findUnique: jest
          .fn()
          .mockImplementation(({ where }: { where: { id: string } }) =>
            Promise.resolve(
              SESSION_ROWS.find((row) => row.id === where.id) ?? null,
            ),
          ),
      },
      formation: {
        upsert: jest
          .fn()
          .mockImplementation(
            ({ create }: { create: { assignment: unknown } }) =>
              Promise.resolve(create),
          ),
      },
    };
    attendance = {
      getCurrentWeek: jest.fn(),
      getSessions: jest.fn(),
    };

    service = new TeamBuilderService(
      prisma as unknown as PrismaService,
      attendance as unknown as AttendanceService,
    );
  });

  it('ghi đội hình cho trận chưa đánh', async () => {
    const result = await service.saveFormation(
      'session-sat',
      { 'team-1-pos-1': 'char-1' },
      WEDNESDAY,
    );

    expect(result.sessionId).toBe('session-sat');
    expect(result.assignment).toEqual({ 'team-1-pos-1': 'char-1' });
    expect(result.locked).toBe(false);
  });

  it('lưu hai lần cùng payload cho cùng kết quả', async () => {
    const payload = { 'team-1-pos-1': 'char-1' };

    const first = await service.saveFormation(
      'session-sat',
      payload,
      WEDNESDAY,
    );
    const second = await service.saveFormation(
      'session-sat',
      payload,
      WEDNESDAY,
    );

    expect(second).toEqual(first);
  });

  it('từ chối ghi vào trận đã đánh xong', async () => {
    await expect(
      service.saveFormation('session-tue', {}, WEDNESDAY),
    ).rejects.toThrow(ConflictException);
  });

  it('báo không tìm thấy khi sessionId không tồn tại', async () => {
    await expect(
      service.saveFormation('session-khong-co', {}, WEDNESDAY),
    ).rejects.toThrow(NotFoundException);
  });

  it('bỏ nhân vật đã rời bang ngay khi trả về', async () => {
    const result = await service.saveFormation(
      'session-sat',
      { 'team-1-pos-1': 'char-1', 'team-1-pos-2': 'char-99' },
      WEDNESDAY,
    );

    expect(result.assignment).toEqual({ 'team-1-pos-1': 'char-1' });
  });
});
