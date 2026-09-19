import { GuildRole } from '@guild/shared/enums';

import { TOKEN_TYPE, type JwtPayload } from '../../../common';
import { buildAttendanceBoard } from '../attendance-board';
import { BUTTON_STYLE } from '../discord.constants';
import type {
  ActionRow,
  CommandDeps,
  CustomIdButton,
} from '../commands/command.types';

/**
 * Narrow one action row to the buttons that carry a `custom_id`.
 *
 * `ActionRow` also admits link buttons, which the announcement uses; the attendance board never
 * builds one, so a row here is entirely `CustomIdButton` and the fields below are always present.
 *
 * @param row - The row under test
 * @returns Its custom_id buttons, in order
 */
function customIdButtons(row: ActionRow | undefined): CustomIdButton[] {
  return (row?.components ?? []).filter(
    (button): button is CustomIdButton => 'custom_id' in button,
  );
}

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
    isAttendanceClosed: false,
    canReopenAttendance: false,
    isGuildWar: false,
    opponent: null,
    ...overrides,
  };
}

/**
 * Build deps whose schedule and records are fixed.
 * @param options.sessions - What listByWeek returns
 * @param options.records - What getRecordsForSessions returns
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
    attendance: {
      getRecordsForSessions: jest.fn().mockResolvedValue(options.records),
    },
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
  // Discord gives the whole press three seconds, so the round trips are part of the behaviour: the
  // board used to derive the week twice, and each derivation writes (it materialises the Guild War).
  it('chỉ đọc lịch tuần một lần, và đọc bản ghi theo đúng những ngày vừa đọc', async () => {
    const listByWeek = jest
      .fn()
      .mockResolvedValue([session({ id: 'a' }), session({ id: 'b' })]);
    const getRecordsForSessions = jest.fn().mockResolvedValue([]);
    const deps = {
      battleSessions: { listByWeek },
      attendance: { getRecordsForSessions },
    } as never as CommandDeps;

    await buildAttendanceBoard(TARGET, actorOf(GuildRole.MEMBER), deps);

    expect(listByWeek).toHaveBeenCalledTimes(1);
    expect(getRecordsForSessions).toHaveBeenCalledWith(['a', 'b']);
  });

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

  it('member không có nút ở ngày đã khoá', async () => {
    const deps = makeDeps({
      sessions: [session({ id: 'a', isAttendanceClosed: true })],
      records: [],
    });

    const board = await buildAttendanceBoard(
      TARGET,
      actorOf(GuildRole.MEMBER),
      deps,
    );

    expect(board.components ?? []).toHaveLength(0);
    expect(board.content).toContain('đã khoá');
  });

  it('admin vẫn có nút ở ngày đã khoá', async () => {
    // An admin can bypass a closed day - that is AttendanceService's rule, and the board has to
    // reflect it.
    const deps = makeDeps({
      sessions: [session({ id: 'a', isAttendanceClosed: true })],
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
    // Discord stacks every action row below the text block rather than interleaving them per day,
    // so the day has to be in the button label - otherwise the five rows of buttons are
    // indistinguishable.
    const deps = makeDeps({ sessions: [session({ id: 'a' })], records: [] });

    const board = await buildAttendanceBoard(
      TARGET,
      actorOf(GuildRole.MEMBER),
      deps,
    );

    const buttons = customIdButtons(board.components?.[0]);

    expect(buttons).toHaveLength(2);
    expect(buttons[0].label).toBe('Thứ 5 · 20:30 · Có');
    expect(buttons[1].label).toBe('Thứ 5 · 20:30 · Không');
    expect(buttons[0].custom_id).toBe('dd:a:meo-beo-k7ma3x:1');
  });

  it('chưa trả lời thì cả hai nút đều xám', async () => {
    // Colour encodes STATE, not meaning: with both buttons lit there is nothing left to tell the
    // user which one they picked.
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

    for (const button of customIdButtons(board.components![0])) {
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
    // Discord allows only 5 action rows. Silently dropping a day is not acceptable.
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
    // The bot sends no reason and AttendanceService takes the reason from the request - so this
    // write overwrites the previous explanation with null. The user has to know that before
    // pressing.
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
