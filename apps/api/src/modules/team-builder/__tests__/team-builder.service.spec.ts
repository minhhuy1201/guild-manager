import { AttendanceService } from '@/modules/attendance/attendance.service';
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

    expect(result.find((i) => i.sessionId === 'session-tue')?.locked).toBe(true);
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
