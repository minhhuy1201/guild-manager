import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { GuildClass } from '@guild/shared/enums';

import { FixedClock } from '../../../common';
import { BattleSessionsService } from '../../battle-sessions/battle-sessions.public';
import { CharactersService } from '../../characters/characters.public';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
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

// Lịch tuần như battle-sessions trả về: nhãn đã dựng, không kèm số liệu phụ.
const SCHEDULED_SESSIONS = [
  {
    id: 'session-tue',
    label: 'Thứ 3 · 20:30',
    dateTime: vn('2026-07-21T20:30'),
    opponent: 'Hắc Long Đường',
    isGuildWar: false,
  },
  {
    id: 'session-thu',
    label: 'Thứ 5 · 20:30',
    dateTime: vn('2026-07-23T20:30'),
    opponent: 'Thiên Nhẫn Giáo',
    isGuildWar: false,
  },
  {
    id: 'session-sat',
    label: 'Thứ 7 · Guild War',
    dateTime: vn('2026-07-25T20:00'),
    opponent: null,
    isGuildWar: true,
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
    formationMatch: { findMany: jest.Mock; deleteMany: jest.Mock };
  };
  let battleSessions: {
    getActiveWeek: jest.Mock;
    ensureWeekMaterialized: jest.Mock;
    readWeekSessions: jest.Mock;
  };
  let characters: { list: jest.Mock };

  beforeEach(() => {
    prisma = {
      formationMatch: {
        findMany: jest.fn().mockResolvedValue(FORMATION_MATCH_ROWS),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    battleSessions = {
      getActiveWeek: jest.fn().mockReturnValue(WEEK_START),
      ensureWeekMaterialized: jest.fn().mockResolvedValue(undefined),
      readWeekSessions: jest.fn().mockResolvedValue(SCHEDULED_SESSIONS),
    };

    characters = { list: jest.fn().mockResolvedValue([]) };

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
    // Hành vi đổi có chủ ý: trước đây chuỗi này không khớp hàng nào nên ra [].
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

  it('mốc tuần hỏng thành 400, không gọi xuống module lịch', async () => {
    await expect(service.getFormations('xyz')).rejects.toThrow(
      BadRequestException,
    );
    expect(battleSessions.readWeekSessions).not.toHaveBeenCalled();
  });

  it('nhãn trận lấy từ lịch đánh, không tự dựng lại', async () => {
    const result = await service.getFormations();

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
    formationMatch: { deleteMany: jest.Mock };
  };
  let battleSessions: {
    getActiveWeek: jest.Mock;
    ensureWeekMaterialized: jest.Mock;
    listWeekAnchors: jest.Mock;
  };
  let characters: { list: jest.Mock };

  beforeEach(() => {
    prisma = {
      formationMatch: { deleteMany: jest.fn().mockResolvedValue({ count: 2 }) },
    };
    battleSessions = {
      getActiveWeek: jest.fn().mockReturnValue(WEEK_START),
      ensureWeekMaterialized: jest.fn().mockResolvedValue(undefined),
      listWeekAnchors: jest
        .fn()
        .mockResolvedValue([
          WEEK_START.toISOString(),
          vn('2026-07-13T00:00').toISOString(),
        ]),
    };

    characters = { list: jest.fn().mockResolvedValue([]) };

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
    battleSessions.listWeekAnchors.mockResolvedValue([
      nextWeek.toISOString(),
      WEEK_START.toISOString(),
    ]);

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

  it('xoá đội hình cũ hơn 56 ngày trước khi đọc', async () => {
    await service.getWeeks();

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
    battleSessions.listWeekAnchors.mockImplementation(() => {
      order.push('read');
      return Promise.resolve([]);
    });

    await service.getWeeks();

    expect(order).toEqual(['delete', 'read']);
  });
});

/** Đối số của `formationMatch.create` — khai báo để đọc lại mock.calls không lọt `any`. */
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
  };
  let battleSessions: { findById: jest.Mock };
  let characters: { list: jest.Mock };

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
    };
    characters = {
      list: jest.fn().mockResolvedValue([
        { id: 'char-1', name: 'Huy', guildClass: GuildClass.THIET_Y },
        { id: 'char-2', name: 'Lan', guildClass: GuildClass.TO_VAN },
      ]),
    };
    battleSessions = {
      findById: jest.fn().mockResolvedValue({
        id: 'session-thu',
        label: 'Thứ 5 · 20:30',
        dateTime: vn('2026-07-23T20:30').toISOString(),
        opponent: 'Thiên Nhẫn Giáo',
        isGuildWar: false,
        weekStart: WEEK_START.toISOString(),
      }),
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

  it('không tìm thấy ngày đánh thì ném NotFoundException', async () => {
    battleSessions.findById.mockResolvedValue(null);

    await expect(
      service.saveFormation('khong-co', [{ slots: {}, notes: {} }]),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('ngày đã qua giờ đánh thì ném ConflictException', async () => {
    battleSessions.findById.mockResolvedValue({
      id: 'session-tue',
      label: 'Thứ 3 · 20:30',
      dateTime: vn('2026-07-21T20:30').toISOString(),
      opponent: null,
      isGuildWar: false,
      weekStart: WEEK_START.toISOString(),
    });

    await expect(
      service.saveFormation('session-tue', [{ slots: {}, notes: {} }]),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
