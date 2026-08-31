import { ConflictException, NotFoundException } from '@nestjs/common';

import { FixedClock } from '../../../common';
import { BattleSessionsService } from '../../battle-sessions/battle-sessions.public';
import { CharactersService } from '../../characters/characters.public';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { TeamBuilderService } from '../team-builder.service';

/**
 * Build a Date from Vietnam time (UTC+7) for readability in tests.
 * @param iso - A string like '2026-07-22T12:00', read as Vietnam time
 * @returns The matching UTC Date
 */
function vn(iso: string): Date {
  return new Date(`${iso}:00+07:00`);
}

// Wednesday — the Tuesday session is over, Thursday and Saturday are still ahead.
const WEDNESDAY = vn('2026-07-22T12:00');
const WEEK_START = vn('2026-07-20T00:00');

// The week's schedule as battle-sessions returns it: labels built, no extra counts.
const SCHEDULED_SESSIONS = [
  {
    id: 'session-tue',
    label: 'Thứ 3 · 20:30',
    dateTime: vn('2026-07-21T20:30'),
    opponent: 'Hắc Long Đường',
    isGuildWar: false,
    matchCount: 2,
  },
  {
    id: 'session-thu',
    label: 'Thứ 5 · 20:30',
    dateTime: vn('2026-07-23T20:30'),
    opponent: 'Thiên Nhẫn Giáo',
    isGuildWar: false,
    matchCount: 2,
  },
  {
    id: 'session-sat',
    label: 'Thứ 7 · Bang Chiến',
    dateTime: vn('2026-07-25T20:00'),
    opponent: null,
    isGuildWar: true,
    matchCount: 2,
  },
];

const FORMATION_MATCH_ROWS = [
  {
    sessionId: 'session-sat',
    matchIndex: 1,
    slots: [
      { slotId: 'team-1-pos-1', characterId: 'char-1', note: 'giữ buồng' },
      { slotId: 'team-1-pos-4', characterId: null, note: 'chừa cho X' },
    ],
  },
  {
    sessionId: 'session-sat',
    matchIndex: 2,
    slots: [{ slotId: 'team-1-pos-1', characterId: 'char-2', note: null }],
  },
];

describe('TeamBuilderService.getFormations', () => {
  let service: TeamBuilderService;
  let prisma: {
    formationMatch: { findMany: jest.Mock };
  };
  let battleSessions: {
    getActiveWeek: jest.Mock;
    ensureWeekMaterialized: jest.Mock;
    readWeekSessions: jest.Mock;
  };
  let characters: { listIds: jest.Mock };

  beforeEach(() => {
    prisma = {
      formationMatch: {
        findMany: jest.fn().mockResolvedValue(FORMATION_MATCH_ROWS),
      },
    };

    battleSessions = {
      getActiveWeek: jest.fn().mockReturnValue(WEEK_START),
      ensureWeekMaterialized: jest.fn().mockResolvedValue(undefined),
      readWeekSessions: jest.fn().mockResolvedValue(SCHEDULED_SESSIONS),
    };

    characters = { listIds: jest.fn().mockResolvedValue(new Set<string>()) };

    service = new TeamBuilderService(
      prisma as unknown as PrismaService,
      battleSessions as unknown as BattleSessionsService,
      characters as unknown as CharactersService,
      new FixedClock(WEDNESDAY),
    );
  });

  it('trả về đủ 3 trận của tuần, sắp theo thời gian đánh', async () => {
    const result = await service.getFormations();

    expect(result.map((item) => item.sessionId)).toEqual([
      'session-tue',
      'session-thu',
      'session-sat',
    ]);
  });

  it('ngày chưa xếp thì matches rỗng', async () => {
    const result = await service.getFormations();
    const tuesday = result.find((item) => item.sessionId === 'session-tue');

    expect(tuesday?.matches).toEqual([]);
  });

  it('khoá trận đã qua giờ đánh, mở trận còn ở tương lai', async () => {
    const result = await service.getFormations();

    expect(result.find((i) => i.sessionId === 'session-tue')?.locked).toBe(
      true,
    );
    expect(result.find((i) => i.sessionId === 'session-thu')?.locked).toBe(
      false,
    );
  });

  it('trả về hai trận của ngày, đúng thứ tự matchIndex', async () => {
    const result = await service.getFormations();
    const saturday = result.find((item) => item.sessionId === 'session-sat');

    expect(saturday?.matches).toEqual([
      {
        slots: { 'team-1-pos-1': 'char-1' },
        notes: { 'team-1-pos-1': 'giữ buồng', 'team-1-pos-4': 'chừa cho X' },
      },
      { slots: { 'team-1-pos-1': 'char-2' }, notes: {} },
    ]);
  });

  it('hàng chỉ có ghi chú không lọt vào slots', async () => {
    const result = await service.getFormations();
    const saturday = result.find((item) => item.sessionId === 'session-sat');

    expect(saturday?.matches[0].slots).not.toHaveProperty('team-1-pos-4');
    expect(saturday?.matches[0].notes['team-1-pos-4']).toBe('chừa cho X');
  });

  it('trận đã lưu nhưng không còn ô nào vẫn là một phần tử trong matches', async () => {
    // "No match 2" and "match 2 is empty" are distinguished at this layer, not in the codec: the
    // codec only sees an empty row array, the service knows whether a FormationMatch row exists.
    prisma.formationMatch.findMany.mockResolvedValue([
      { sessionId: 'session-sat', matchIndex: 1, slots: [] },
    ]);

    const result = await service.getFormations();
    const saturday = result.find((item) => item.sessionId === 'session-sat');
    const thursday = result.find((item) => item.sessionId === 'session-thu');

    expect(saturday?.matches).toEqual([{ slots: {}, notes: {} }]);
    expect(thursday?.matches).toEqual([]);
  });

  it('đảm bảo trận của tuần đang mở tồn tại trước khi đọc', async () => {
    await service.getFormations();

    expect(battleSessions.ensureWeekMaterialized).toHaveBeenCalledTimes(1);
    expect(battleSessions.ensureWeekMaterialized).toHaveBeenCalledWith(
      WEEK_START,
    );
  });

  it('tuần cũ cũng gọi ensureWeekMaterialized — module lịch tự no-op', async () => {
    const lastWeek = vn('2026-07-13T00:00');

    await service.getFormations(lastWeek.toISOString());

    expect(battleSessions.ensureWeekMaterialized).toHaveBeenCalledWith(
      lastWeek,
    );
    expect(battleSessions.readWeekSessions).toHaveBeenCalledWith(lastWeek);
  });

  it('mốc giữa tuần đọc đúng tuần chứa ngày đó, không trả rỗng', async () => {
    // Deliberate behaviour change: this string previously matched no row and returned [].
    const result = await service.getFormations(
      vn('2026-07-22T12:00').toISOString(),
    );

    expect(battleSessions.readWeekSessions).toHaveBeenCalledWith(WEEK_START);
    expect(result.map((item) => item.sessionId)).toEqual([
      'session-tue',
      'session-thu',
      'session-sat',
    ]);
  });

  // Returning 400 to the user is `weekStartQuerySchema`'s job at the HTTP boundary; here it is
  // enough that a malformed string stops before reaching the schedule module.
  it('mốc tuần hỏng thì ném ngay, không gọi xuống module lịch', async () => {
    await expect(service.getFormations('xyz')).rejects.toThrow(RangeError);
    expect(battleSessions.readWeekSessions).not.toHaveBeenCalled();
  });

  it('nhãn trận lấy từ lịch đánh, không tự dựng lại', async () => {
    const result = await service.getFormations();

    expect(result.map((item) => item.label)).toEqual([
      'Thứ 3 · 20:30',
      'Thứ 5 · 20:30',
      'Thứ 7 · Bang Chiến',
    ]);
  });
});

describe('TeamBuilderService.getWeeks', () => {
  let service: TeamBuilderService;
  // No Prisma mocks: getWeeks only reads through the schedule module and no longer purges data.
  let prisma: Record<string, never>;
  let battleSessions: {
    getActiveWeek: jest.Mock;
    ensureWeekMaterialized: jest.Mock;
    listWeekAnchors: jest.Mock;
  };
  let characters: { listIds: jest.Mock };

  beforeEach(() => {
    prisma = {};
    battleSessions = {
      getActiveWeek: jest.fn().mockReturnValue(WEEK_START),
      ensureWeekMaterialized: jest.fn().mockResolvedValue(undefined),
      listWeekAnchors: jest
        .fn()
        .mockResolvedValue([WEEK_START, vn('2026-07-13T00:00')]),
    };

    characters = { listIds: jest.fn().mockResolvedValue(new Set<string>()) };

    service = new TeamBuilderService(
      prisma as unknown as PrismaService,
      battleSessions as unknown as BattleSessionsService,
      characters as unknown as CharactersService,
      new FixedClock(WEDNESDAY),
    );
  });

  it('trả về các tuần có dữ liệu, mới nhất trước', async () => {
    const weeks = await service.getWeeks();

    expect(weeks).toEqual([
      {
        weekStart: WEEK_START.toISOString(),
        weekEnd: vn('2026-07-25T23:59').toISOString(),
        isActive: true,
      },
      {
        weekStart: vn('2026-07-13T00:00').toISOString(),
        weekEnd: vn('2026-07-18T23:59').toISOString(),
        isActive: false,
      },
    ]);
  });

  it('chốt tuần ở Thứ 7 23:59 giờ VN, không phải Chủ nhật', async () => {
    const [week] = await service.getWeeks();

    expect(week.weekEnd).toBe(vn('2026-07-25T23:59').toISOString());
  });

  it('đánh dấu đúng tuần đang mở khi tuần kế đã có trận', async () => {
    const nextWeek = vn('2026-07-27T00:00');
    battleSessions.listWeekAnchors.mockResolvedValue([nextWeek, WEEK_START]);

    const weeks = await service.getWeeks();

    expect(weeks).toEqual([
      {
        weekStart: nextWeek.toISOString(),
        weekEnd: vn('2026-08-01T23:59').toISOString(),
        isActive: false,
      },
      {
        weekStart: WEEK_START.toISOString(),
        weekEnd: vn('2026-07-25T23:59').toISOString(),
        isActive: true,
      },
    ]);
  });

  it('nhận ra tuần đang mở kể cả khi mốc đến từ một Date khác instance', async () => {
    // The old string comparison happened to be right because both sides went through toISOString();
    // comparing instants does not depend on how the string is written.
    battleSessions.listWeekAnchors.mockResolvedValue([
      new Date(WEEK_START.getTime()),
    ]);

    const [week] = await service.getWeeks();

    expect(week.isActive).toBe(true);
    expect(week.weekStart).toBe(WEEK_START.toISOString());
  });
});

describe('TeamBuilderService.purgeExpiredFormations', () => {
  let service: TeamBuilderService;
  let prisma: { formationMatch: { deleteMany: jest.Mock } };

  beforeEach(() => {
    prisma = {
      formationMatch: { deleteMany: jest.fn().mockResolvedValue({ count: 2 }) },
    };

    service = new TeamBuilderService(
      prisma as unknown as PrismaService,
      {} as unknown as BattleSessionsService,
      {} as unknown as CharactersService,
      new FixedClock(WEDNESDAY),
    );
  });

  it('xoá đội hình của tuần bắt đầu sớm hơn 56 ngày trước', async () => {
    await service.purgeExpiredFormations(WEDNESDAY);

    expect(prisma.formationMatch.deleteMany).toHaveBeenCalledWith({
      where: { session: { weekStart: { lt: vn('2026-05-27T12:00') } } },
    });
  });

  it('chạy được độc lập, không cần dựng cả một tuần lịch', async () => {
    await expect(service.purgeExpiredFormations(WEDNESDAY)).resolves.toBe(2);
  });

  it('mốc cắt đi theo tham số now, không theo đồng hồ của service', async () => {
    await service.purgeExpiredFormations(vn('2026-08-22T12:00'));

    expect(prisma.formationMatch.deleteMany).toHaveBeenCalledWith({
      where: { session: { weekStart: { lt: vn('2026-06-27T12:00') } } },
    });
  });
});

/** Argument of `formationMatch.create` — declared so reading mock.calls does not leak `any`. */
interface CreateMatchArgs {
  data: {
    sessionId: string;
    matchIndex: number;
    slots: {
      create: {
        slotId: string;
        characterId: string | null;
        note: string | null;
      }[];
    };
  };
}

/** The battle day `saveFormation` writes to, as `battleSessions.findById` returns it. */
const SAVED_DAY = {
  id: 'session-thu',
  label: 'Thứ 5 · 20:30',
  dateTime: vn('2026-07-23T20:30').toISOString(),
  opponent: 'Thiên Nhẫn Giáo',
  isGuildWar: false,
  weekStart: WEEK_START.toISOString(),
  matchCount: 2,
};

describe('TeamBuilderService.saveFormation', () => {
  let service: TeamBuilderService;
  let tx: {
    formationMatch: {
      deleteMany: jest.Mock;
      create: jest.Mock<Promise<object>, [CreateMatchArgs]>;
    };
  };
  let prisma: {
    $transaction: jest.Mock;
    formationMatch: { deleteMany: jest.Mock };
  };
  let battleSessions: { findById: jest.Mock };
  let characters: { listIds: jest.Mock };

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
      $transaction: jest.fn((run: (client: typeof tx) => unknown) => run(tx)),
      formationMatch: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };
    characters = {
      listIds: jest.fn().mockResolvedValue(new Set(['char-1', 'char-2'])),
    };
    battleSessions = {
      findById: jest.fn().mockResolvedValue(SAVED_DAY),
    };

    service = new TeamBuilderService(
      prisma as unknown as PrismaService,
      battleSessions as unknown as BattleSessionsService,
      characters as unknown as CharactersService,
      new FixedClock(WEDNESDAY),
    );
  });

  it('lưu hai trận thành hai FormationMatch, matchIndex 1 và 2', async () => {
    await service.saveFormation('session-thu', [
      { slots: { 'team-1-pos-1': 'char-1' }, notes: {} },
      { slots: { 'team-1-pos-1': 'char-2' }, notes: {} },
    ]);

    expect(tx.formationMatch.create).toHaveBeenCalledTimes(2);
    expect(tx.formationMatch.create.mock.calls[0][0].data).toEqual({
      sessionId: 'session-thu',
      matchIndex: 1,
      slots: {
        create: [{ slotId: 'team-1-pos-1', characterId: 'char-1', note: null }],
      },
    });
    expect(tx.formationMatch.create.mock.calls[1][0].data.matchIndex).toBe(2);
  });

  it('xoá sạch đội hình cũ của ngày trước khi ghi lại', async () => {
    await service.saveFormation('session-thu', [{ slots: {}, notes: {} }]);

    expect(tx.formationMatch.deleteMany).toHaveBeenCalledWith({
      where: { sessionId: 'session-thu' },
    });
  });

  it('lưu lại mảng một phần tử thì chỉ còn một trận', async () => {
    await service.saveFormation('session-thu', [{ slots: {}, notes: {} }]);

    expect(tx.formationMatch.create).toHaveBeenCalledTimes(1);
  });

  it('bỏ characterId không còn trong bảng Character', async () => {
    const result = await service.saveFormation('session-thu', [
      {
        slots: { 'team-1-pos-1': 'char-1', 'team-1-pos-2': 'char-99' },
        notes: {},
      },
    ]);

    expect(tx.formationMatch.create.mock.calls[0][0].data.slots.create).toEqual(
      [{ slotId: 'team-1-pos-1', characterId: 'char-1', note: null }],
    );
    expect(result.matches).toEqual([
      { slots: { 'team-1-pos-1': 'char-1' }, notes: {} },
    ]);
  });

  it('ô chỉ có ghi chú mà chưa xếp ai vẫn được lưu', async () => {
    await service.saveFormation('session-thu', [
      { slots: {}, notes: { 'team-1-pos-4': 'chừa cho X' } },
    ]);

    expect(tx.formationMatch.create.mock.calls[0][0].data.slots.create).toEqual(
      [{ slotId: 'team-1-pos-4', characterId: null, note: 'chừa cho X' }],
    );
  });

  it('ô vừa có người vừa có ghi chú chỉ tạo một hàng', async () => {
    await service.saveFormation('session-thu', [
      {
        slots: { 'team-1-pos-1': 'char-1' },
        notes: { 'team-1-pos-1': 'giữ buồng' },
      },
    ]);

    expect(tx.formationMatch.create.mock.calls[0][0].data.slots.create).toEqual(
      [{ slotId: 'team-1-pos-1', characterId: 'char-1', note: 'giữ buồng' }],
    );
  });

  it('characterId không còn trong bang bị lọc nhưng ghi chú của ô đó vẫn giữ', async () => {
    const result = await service.saveFormation('session-thu', [
      {
        slots: { 'team-1-pos-2': 'char-99' },
        notes: { 'team-1-pos-2': 'vào sau' },
      },
    ]);

    expect(tx.formationMatch.create.mock.calls[0][0].data.slots.create).toEqual(
      [{ slotId: 'team-1-pos-2', characterId: null, note: 'vào sau' }],
    );
    expect(result.matches).toEqual([
      { slots: {}, notes: { 'team-1-pos-2': 'vào sau' } },
    ]);
  });

  it('gửi hai lần cùng payload cho cùng kết quả', async () => {
    const matches = [{ slots: { 'team-1-pos-1': 'char-1' }, notes: {} }];

    const first = await service.saveFormation('session-thu', matches);
    const second = await service.saveFormation('session-thu', matches);

    expect(second).toEqual(first);
  });

  it('đọc danh sách nhân vật bằng chính client của transaction', async () => {
    await service.saveFormation('session-thu', [{ slots: {}, notes: {} }]);

    expect(characters.listIds).toHaveBeenCalledWith(tx);
  });

  it('trận vừa lưu chưa khoá — giờ đánh còn ở tương lai', async () => {
    const result = await service.saveFormation('session-thu', [
      { slots: {}, notes: {} },
    ]);

    expect(result.locked).toBe(false);
  });

  it('dọn đội hình quá hạn trên đường ghi, theo đồng hồ ứng dụng', async () => {
    await service.saveFormation('session-thu', [{ slots: {}, notes: {} }]);

    expect(prisma.formationMatch.deleteMany).toHaveBeenCalledWith({
      where: { session: { weekStart: { lt: vn('2026-05-27T12:00') } } },
    });
  });

  it('dọn TRƯỚC transaction để lưu xong rồi mới hỏng thì không thành 500', async () => {
    const order: string[] = [];
    prisma.formationMatch.deleteMany.mockImplementation(() => {
      order.push('purge');
      return Promise.resolve({ count: 0 });
    });
    prisma.$transaction.mockImplementation(
      (run: (client: typeof tx) => unknown) => {
        order.push('write');
        return run(tx);
      },
    );

    await service.saveFormation('session-thu', [{ slots: {}, notes: {} }]);

    expect(order).toEqual(['purge', 'write']);
  });

  it('ngày đã khoá thì không dọn gì cả — request bị từ chối là không đụng dữ liệu', async () => {
    battleSessions.findById.mockResolvedValue({
      ...SAVED_DAY,
      id: 'session-tue',
      label: 'Thứ 3 · 20:30',
      dateTime: vn('2026-07-21T20:30').toISOString(),
      opponent: null,
    });

    await expect(
      service.saveFormation('session-tue', [{ slots: {}, notes: {} }]),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.formationMatch.deleteMany).not.toHaveBeenCalled();
  });

  it('không tìm thấy ngày đánh thì ném NotFoundException', async () => {
    battleSessions.findById.mockResolvedValue(null);

    await expect(
      service.saveFormation('khong-co', [{ slots: {}, notes: {} }]),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('ngày đã qua giờ đánh thì ném ConflictException', async () => {
    battleSessions.findById.mockResolvedValue({
      ...SAVED_DAY,
      id: 'session-tue',
      label: 'Thứ 3 · 20:30',
      dateTime: vn('2026-07-21T20:30').toISOString(),
      opponent: null,
    });

    await expect(
      service.saveFormation('session-tue', [{ slots: {}, notes: {} }]),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('thành viên bị xoá đúng lúc ghi thành 409, không phải 500', async () => {
    // The filter reads inside the transaction, but READ COMMITTED does not lock the rows read, so a
    // DELETE committing after `listIds` still breaks the insert's foreign key.
    tx.formationMatch.create.mockRejectedValue(
      Object.assign(new Error('Foreign key constraint failed'), {
        code: 'P2003',
      }),
    );

    await expect(
      service.saveFormation('session-thu', [
        { slots: { 'team-1-pos-1': 'char-1' }, notes: {} },
      ]),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lỗi database khác không bị nuốt thành 409', async () => {
    const failure = new Error('connection terminated');
    tx.formationMatch.create.mockRejectedValue(failure);

    await expect(
      service.saveFormation('session-thu', [
        { slots: { 'team-1-pos-1': 'char-1' }, notes: {} },
      ]),
    ).rejects.toBe(failure);
  });

  describe('số trận là trần trên của số đội hình', () => {
    it('từ chối lưu 2 đội hình cho ngày chỉ đánh 1 trận', async () => {
      battleSessions.findById.mockResolvedValue({
        ...SAVED_DAY,
        matchCount: 1,
      });

      await expect(
        service.saveFormation('session-thu', [
          { slots: {}, notes: {} },
          { slots: {}, notes: {} },
        ]),
      ).rejects.toThrow(ConflictException);
    });

    it('cho lưu 1 đội hình cho ngày đánh 2 trận — cả hai trận dùng chung', async () => {
      const saved = await service.saveFormation('session-thu', [
        { slots: {}, notes: {} },
      ]);

      expect(saved.matches).toHaveLength(1);
      expect(saved.matchCount).toBe(2);
    });
  });
});
