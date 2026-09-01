import { GuildRole } from '@guild/shared/enums';

import { TOKEN_TYPE, type JwtPayload } from '../../../common';
import { buildAttendanceBoard } from '../attendance-board';
import type { CommandDeps } from '../commands/command.types';

const TARGET = { characterId: 'meo-beo-k7ma3x', characterName: 'Mèo Béo' };

/**
 * A battle session as `listByWeek` returns it, with only the fields the board reads.
 * @param overrides - Fields to change
 * @returns The session stub
 */
function session(overrides: Record<string, unknown>): unknown {
  return {
    id: 'session-1',
    label: 'Thứ 5 · 20:30',
    dateTime: '2026-09-03T13:30:00.000Z',
    isDeadlinePassed: false,
    isGuildWar: false,
    opponent: null,
    ...overrides,
  };
}

/**
 * Build deps whose schedule and records are fixed.
 * @param options.sessions - What listByWeek returns
 * @param options.records - What getRecords returns
 * @returns Stubbed deps
 */
function makeDeps(options: {
  sessions: unknown[];
  records: unknown[];
}): CommandDeps {
  return {
    battleSessions: {
      listByWeek: jest.fn().mockResolvedValue(options.sessions),
    },
    attendance: { getRecords: jest.fn().mockResolvedValue(options.records) },
    characters: {},
    actors: {},
  } as never;
}

/**
 * An actor of the given role.
 * @param role - Role to act with
 * @returns The payload
 */
function actorOf(role: GuildRole): JwtPayload {
  return { sub: '111', role, type: TOKEN_TYPE.access };
}

describe('buildAttendanceBoard', () => {
  it('liệt kê mọi ngày đánh kèm trạng thái', async () => {
    const deps = makeDeps({
      sessions: [
        session({ id: 'a', label: 'Thứ 5 · 20:30' }),
        session({ id: 'b', label: 'Thứ 7 · Bang Chiến', isGuildWar: true }),
      ],
      records: [
        { characterId: TARGET.characterId, sessionId: 'b', isPresent: true },
      ],
    });

    const board = await buildAttendanceBoard(
      TARGET,
      actorOf(GuildRole.MEMBER),
      deps,
    );

    expect(board.content).toContain('Mèo Béo');
    expect(board.content).toContain('Thứ 5 · 20:30');
    expect(board.content).toContain('chưa trả lời');
    expect(board.content).toContain('Thứ 7 · Bang Chiến');
    expect(board.content).toContain('Có');
  });

  it('bỏ qua bản ghi của nhân vật khác', async () => {
    const deps = makeDeps({
      sessions: [session({ id: 'a' })],
      records: [{ characterId: 'ai-do-khac', sessionId: 'a', isPresent: true }],
    });

    const board = await buildAttendanceBoard(
      TARGET,
      actorOf(GuildRole.MEMBER),
      deps,
    );

    expect(board.content).toContain('chưa trả lời');
  });

  it('member không có nút ở ngày đã quá hạn', async () => {
    const deps = makeDeps({
      sessions: [session({ id: 'a', isDeadlinePassed: true })],
      records: [],
    });

    const board = await buildAttendanceBoard(
      TARGET,
      actorOf(GuildRole.MEMBER),
      deps,
    );

    expect(board.components ?? []).toHaveLength(0);
    expect(board.content).toContain('đã quá hạn');
  });

  it('admin vẫn có nút ở ngày đã quá hạn', async () => {
    // Admin bypass deadline — luật của AttendanceService, bảng phải phản ánh đúng.
    const deps = makeDeps({
      sessions: [session({ id: 'a', isDeadlinePassed: true })],
      records: [],
    });

    const board = await buildAttendanceBoard(
      TARGET,
      actorOf(GuildRole.ADMIN),
      deps,
    );

    expect(board.components).toHaveLength(1);
  });

  it('mỗi ngày một hàng, hai nút Có và Không', async () => {
    const deps = makeDeps({ sessions: [session({ id: 'a' })], records: [] });

    const board = await buildAttendanceBoard(
      TARGET,
      actorOf(GuildRole.MEMBER),
      deps,
    );

    const row = board.components?.[0];

    expect(row?.components).toHaveLength(2);
    expect(row?.components[0].label).toBe('Thứ 5 · 20:30 · Có');
    expect(row?.components[1].label).toBe('Thứ 5 · 20:30 · Không');
    expect(row?.components[0].custom_id).toBe('dd:a:meo-beo-k7ma3x:1');
  });

  it('khoá nút ứng với câu trả lời đang có hiệu lực', async () => {
    const deps = makeDeps({
      sessions: [session({ id: 'a' })],
      records: [
        { characterId: TARGET.characterId, sessionId: 'a', isPresent: true },
      ],
    });

    const board = await buildAttendanceBoard(
      TARGET,
      actorOf(GuildRole.MEMBER),
      deps,
    );

    expect(board.components?.[0].components[0].disabled).toBe(true);
    expect(board.components?.[0].components[1].disabled).toBeUndefined();
  });

  it('quá 5 ngày thì cắt còn 5 và nói ra', async () => {
    // Discord chỉ cho 5 action row. Im lặng cắt mất một ngày thì không chấp nhận được.
    const deps = makeDeps({
      sessions: Array.from({ length: 6 }, (_, index) =>
        session({ id: `s${index}`, label: `Ngày ${index}` }),
      ),
      records: [],
    });

    const board = await buildAttendanceBoard(
      TARGET,
      actorOf(GuildRole.MEMBER),
      deps,
    );

    expect(board.components).toHaveLength(5);
    expect(board.content).toContain('Ngày 5');
    expect(board.content).toContain('trên web');
  });

  it('cảnh báo rằng bấm Không sẽ xoá lý do đã ghi trên web', async () => {
    // Bot không gửi reason, mà AttendanceService quyết reason từ request — nên lượt ghi này ghi đè
    // null lên câu lý do cũ. Người dùng phải biết trước khi bấm.
    const deps = makeDeps({ sessions: [session({ id: 'a' })], records: [] });

    const board = await buildAttendanceBoard(
      TARGET,
      actorOf(GuildRole.MEMBER),
      deps,
    );

    expect(board.content).toContain('xoá lý do');
  });

  it('tuần không có ngày đánh nào', async () => {
    const deps = makeDeps({ sessions: [], records: [] });

    const board = await buildAttendanceBoard(
      TARGET,
      actorOf(GuildRole.MEMBER),
      deps,
    );

    expect(board.content).toContain('chưa có ngày đánh');
    expect(board.components ?? []).toHaveLength(0);
  });
});
