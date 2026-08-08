import { ConflictException, NotFoundException } from '@nestjs/common';

import { BattleSessionsService } from '@/modules/battle-sessions/battle-sessions.module';
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
    dateTime: vn('2026-07-21T20:30'),
    deadline: vn('2026-07-21T10:00'),
    opponent: 'Hắc Long Đường',
    isGuildWar: false,
    weekStart: WEEK_START,
  },
  {
    id: 'session-thu',
    dateTime: vn('2026-07-23T20:30'),
    deadline: vn('2026-07-23T17:00'),
    opponent: 'Thiên Nhẫn Giáo',
    isGuildWar: false,
    weekStart: WEEK_START,
  },
  {
    id: 'session-sat',
    dateTime: vn('2026-07-25T20:00'),
    deadline: vn('2026-07-23T17:00'),
    opponent: null,
    isGuildWar: true,
    weekStart: WEEK_START,
  },
];

describe('TeamBuilderService.getFormations', () => {
  let service: TeamBuilderService;
  let prisma: {
    character: { findMany: jest.Mock };
    battleSession: { findMany: jest.Mock };
    formationMatch: { deleteMany: jest.Mock };
  };
  let battleSessions: {
    getActiveWeekStart: jest.Mock;
    listByWeek: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      character: { findMany: jest.fn().mockResolvedValue([]) },
      battleSession: {
        findMany: jest.fn().mockResolvedValue(
          SESSION_ROWS.map((row) => ({
            ...row,
            formationMatches:
              row.id === 'session-sat'
                ? [
                    {
                      matchIndex: 1,
                      slots: [
                        { slotId: 'team-1-pos-1', characterId: 'char-1' },
                      ],
                    },
                    {
                      matchIndex: 2,
                      slots: [
                        { slotId: 'team-1-pos-1', characterId: 'char-2' },
                      ],
                    },
                  ]
                : [],
          })),
        ),
      },
      formationMatch: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };

    battleSessions = {
      getActiveWeekStart: jest.fn().mockReturnValue(WEEK_START.toISOString()),
      listByWeek: jest.fn().mockResolvedValue([]),
    };

    service = new TeamBuilderService(
      prisma as unknown as PrismaService,
      battleSessions as unknown as BattleSessionsService,
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

  it('ngày chưa xếp thì matches rỗng', async () => {
    const result = await service.getFormations(undefined, WEDNESDAY);
    const tuesday = result.find((item) => item.sessionId === 'session-tue');

    expect(tuesday?.matches).toEqual([]);
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

  it('trả về hai trận của ngày, đúng thứ tự matchIndex', async () => {
    const result = await service.getFormations(undefined, WEDNESDAY);
    const saturday = result.find((item) => item.sessionId === 'session-sat');

    expect(saturday?.matches).toEqual([
      { 'team-1-pos-1': 'char-1' },
      { 'team-1-pos-1': 'char-2' },
    ]);
  });

  it('đảm bảo trận của tuần đang mở tồn tại trước khi đọc', async () => {
    await service.getFormations(undefined, WEDNESDAY);

    expect(battleSessions.listByWeek).toHaveBeenCalled();
  });

  it('nhãn trận suy ra từ giờ đánh, không đọc từ database', async () => {
    const result = await service.getFormations(undefined, WEDNESDAY);

    expect(result.map((item) => item.label)).toEqual([
      'Thứ 3 · 20:30',
      'Thứ 5 · 20:30',
      'Thứ 7 · Guild War',
    ]);
  });
});

describe('TeamBuilderService.getWeeks', () => {
  let service: TeamBuilderService;
  let prisma: {
    character: { findMany: jest.Mock };
    battleSession: { findMany: jest.Mock };
    formationMatch: { deleteMany: jest.Mock };
  };
  let battleSessions: {
    getActiveWeekStart: jest.Mock;
    listByWeek: jest.Mock;
  };

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
      formationMatch: { deleteMany: jest.fn().mockResolvedValue({ count: 2 }) },
    };
    battleSessions = {
      getActiveWeekStart: jest.fn().mockReturnValue(WEEK_START.toISOString()),
      listByWeek: jest.fn().mockResolvedValue([]),
    };

    service = new TeamBuilderService(
      prisma as unknown as PrismaService,
      battleSessions as unknown as BattleSessionsService,
    );
  });

  it('trả về các tuần có dữ liệu, mới nhất trước', async () => {
    const weeks = await service.getWeeks(WEDNESDAY);

    expect(weeks).toEqual([
      { weekStart: WEEK_START.toISOString(), isActive: true },
      { weekStart: vn('2026-07-13T00:00').toISOString(), isActive: false },
    ]);
  });

  it('đánh dấu đúng tuần đang mở khi tuần kế đã có trận', async () => {
    const nextWeek = vn('2026-07-27T00:00');
    prisma.battleSession.findMany.mockResolvedValue([
      { weekStart: nextWeek },
      { weekStart: WEEK_START },
    ]);

    const weeks = await service.getWeeks(WEDNESDAY);

    expect(weeks).toEqual([
      { weekStart: nextWeek.toISOString(), isActive: false },
      { weekStart: WEEK_START.toISOString(), isActive: true },
    ]);
  });

  it('xoá đội hình cũ hơn 56 ngày trước khi đọc', async () => {
    await service.getWeeks(WEDNESDAY);

    expect(prisma.formationMatch.deleteMany).toHaveBeenCalledWith({
      where: { session: { weekStart: { lt: vn('2026-05-27T12:00') } } },
    });
  });

  it('dọn dữ liệu chạy trước khi liệt kê tuần', async () => {
    const order: string[] = [];
    prisma.formationMatch.deleteMany.mockImplementation(() => {
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

/** Đối số của `formationMatch.create` — khai báo để đọc lại mock.calls không lọt `any`. */
interface CreateMatchArgs {
  data: {
    sessionId: string;
    matchIndex: number;
    slots: { create: { slotId: string; characterId: string }[] };
  };
}

describe('TeamBuilderService.saveFormation', () => {
  let service: TeamBuilderService;
  let tx: {
    formationMatch: {
      deleteMany: jest.Mock;
      create: jest.Mock<Promise<object>, [CreateMatchArgs]>;
    };
  };
  let prisma: {
    character: { findMany: jest.Mock };
    battleSession: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    tx = {
      formationMatch: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest
          .fn<Promise<object>, [CreateMatchArgs]>()
          .mockResolvedValue({}),
      },
    };
    prisma = {
      character: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'char-1' }, { id: 'char-2' }]),
      },
      battleSession: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'session-thu',
          dateTime: vn('2026-07-23T20:30'),
          opponent: 'Thiên Nhẫn Giáo',
          isGuildWar: false,
          weekStart: WEEK_START,
        }),
      },
      $transaction: jest.fn((run: (client: typeof tx) => unknown) => run(tx)),
    };

    service = new TeamBuilderService(
      prisma as unknown as PrismaService,
      {} as unknown as BattleSessionsService,
    );
  });

  it('lưu hai trận thành hai FormationMatch, matchIndex 1 và 2', async () => {
    await service.saveFormation(
      'session-thu',
      [{ 'team-1-pos-1': 'char-1' }, { 'team-1-pos-1': 'char-2' }],
      WEDNESDAY,
    );

    expect(tx.formationMatch.create).toHaveBeenCalledTimes(2);
    expect(tx.formationMatch.create.mock.calls[0][0].data).toEqual({
      sessionId: 'session-thu',
      matchIndex: 1,
      slots: { create: [{ slotId: 'team-1-pos-1', characterId: 'char-1' }] },
    });
    expect(tx.formationMatch.create.mock.calls[1][0].data.matchIndex).toBe(2);
  });

  it('xoá sạch đội hình cũ của ngày trước khi ghi lại', async () => {
    await service.saveFormation('session-thu', [{}], WEDNESDAY);

    expect(tx.formationMatch.deleteMany).toHaveBeenCalledWith({
      where: { sessionId: 'session-thu' },
    });
  });

  it('lưu lại mảng một phần tử thì chỉ còn một trận', async () => {
    await service.saveFormation('session-thu', [{}], WEDNESDAY);

    expect(tx.formationMatch.create).toHaveBeenCalledTimes(1);
  });

  it('bỏ characterId không còn trong bảng Character', async () => {
    const result = await service.saveFormation(
      'session-thu',
      [{ 'team-1-pos-1': 'char-1', 'team-1-pos-2': 'char-99' }],
      WEDNESDAY,
    );

    expect(tx.formationMatch.create.mock.calls[0][0].data.slots.create).toEqual(
      [{ slotId: 'team-1-pos-1', characterId: 'char-1' }],
    );
    expect(result.matches).toEqual([{ 'team-1-pos-1': 'char-1' }]);
  });

  it('gửi hai lần cùng payload cho cùng kết quả', async () => {
    const matches = [{ 'team-1-pos-1': 'char-1' }];

    const first = await service.saveFormation(
      'session-thu',
      matches,
      WEDNESDAY,
    );
    const second = await service.saveFormation(
      'session-thu',
      matches,
      WEDNESDAY,
    );

    expect(second).toEqual(first);
  });

  it('không tìm thấy ngày đánh thì ném NotFoundException', async () => {
    prisma.battleSession.findUnique.mockResolvedValue(null);

    await expect(
      service.saveFormation('khong-co', [{}], WEDNESDAY),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('ngày đã qua giờ đánh thì ném ConflictException', async () => {
    prisma.battleSession.findUnique.mockResolvedValue({
      id: 'session-tue',
      dateTime: vn('2026-07-21T20:30'),
      opponent: null,
      isGuildWar: false,
      weekStart: WEEK_START,
    });

    await expect(
      service.saveFormation('session-tue', [{}], WEDNESDAY),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
