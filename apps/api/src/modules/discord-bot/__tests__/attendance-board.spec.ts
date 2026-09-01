import { GuildRole } from '@guild/shared/enums';

import { TOKEN_TYPE, type JwtPayload } from '../../../common';
import { buildAttendanceBoard } from '../attendance-board';
import { BUTTON_STYLE } from '../discord.constants';
import type { CommandDeps } from '../commands/command.types';

const TARGET = {
  characterId: 'meo-beo-k7ma3x',
  characterName: 'Mèo Béo',
  discordId: null,
};

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
    expect(board.content).toContain('**CÓ**');
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

  it('mỗi ngày một hàng, hai nút mang tên ngày', async () => {
    // Discord dồn mọi action row xuống dưới khối chữ chứ không xen kẽ theo từng ngày, nên tên ngày
    // phải nằm trong nhãn nút — không thì 5 hàng nút không phân biệt được với nhau.
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

  it('chưa trả lời thì cả hai nút đều xám', async () => {
    // Màu mã hoá TRẠNG THÁI, không mã hoá ý nghĩa: hai nút cùng sáng thì không còn gì nói cho người
    // dùng biết họ đã chọn cái nào.
    const deps = makeDeps({ sessions: [session({ id: 'a' })], records: [] });

    const board = await buildAttendanceBoard(
      TARGET,
      actorOf(GuildRole.MEMBER),
      deps,
    );

    const [yes, no] = board.components![0].components;

    expect(yes.style).toBe(BUTTON_STYLE.secondary);
    expect(no.style).toBe(BUTTON_STYLE.secondary);
  });

  it('đúng một nút sáng lên kèm dấu ✔ cho câu trả lời đang có hiệu lực', async () => {
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

    const [yes, no] = board.components![0].components;

    expect(yes.style).toBe(BUTTON_STYLE.success);
    expect(yes.label).toBe('✔ Thứ 5 · 20:30 · Có');
    expect(no.style).toBe(BUTTON_STYLE.secondary);
    expect(no.label).not.toContain('✔');
  });

  it('không khoá nút nào — nút mờ trông như không bấm được', async () => {
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

    for (const button of board.components![0].components) {
      expect(button.disabled).toBeUndefined();
    }
  });

  it('mỗi ngày có một emoji trạng thái để liếc là thấy', async () => {
    const deps = makeDeps({
      sessions: [
        session({ id: 'a', label: 'Ngày chưa trả lời' }),
        session({ id: 'b', label: 'Ngày có' }),
        session({ id: 'c', label: 'Ngày không' }),
      ],
      records: [
        { characterId: TARGET.characterId, sessionId: 'b', isPresent: true },
        { characterId: TARGET.characterId, sessionId: 'c', isPresent: false },
      ],
    });

    const board = await buildAttendanceBoard(
      TARGET,
      actorOf(GuildRole.MEMBER),
      deps,
    );

    expect(board.content).toContain('⬜ **Ngày chưa trả lời**');
    expect(board.content).toContain('✅ **Ngày có**');
    expect(board.content).toContain('❌ **Ngày không**');
  });

  it('nhắc tên người được điểm danh khi nhân vật có discord id', async () => {
    const deps = makeDeps({ sessions: [session({ id: 'a' })], records: [] });

    const board = await buildAttendanceBoard(
      { ...TARGET, discordId: '999' },
      actorOf(GuildRole.ADMIN),
      deps,
    );

    expect(board.content).toContain('<@999>');
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
