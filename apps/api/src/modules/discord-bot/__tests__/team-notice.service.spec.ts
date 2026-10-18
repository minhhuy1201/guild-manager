import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { BattleSession, MatchFormation } from '@guild/shared/schemas';

import { TeamNoticeService } from '../team-notice.service';

/** A 20:30 scrim over two matches whose attendance is already closed by the announcement. */
function session(overrides: Partial<BattleSession> = {}): BattleSession {
  return {
    id: 'session-1',
    label: 'Thứ 4 · 20:30',
    dateTime: '2026-08-19T13:30:00.000Z',
    deadline: '2026-08-19T03:00:00.000Z',
    isAttendanceClosed: true,
    canReopenAttendance: true,
    isGuildWar: false,
    opponent: 'Moonlight',
    weekStart: '2026-08-16T17:00:00.000Z',
    attendanceCount: 0,
    matchCount: 2,
    formationMatchCount: 2,
    ...overrides,
  };
}

/** The members the line-ups below place. `discordId` null = nobody entered it yet. */
const MEMBERS = [
  { id: 'kirito', name: 'Kirito', discordId: 'd-kirito' },
  { id: 'asuna', name: 'Asuna', discordId: 'd-asuna' },
  { id: 'klein', name: 'Klein', discordId: null },
  { id: 'sinon', name: 'Sinon', discordId: 'd-sinon' },
];

/** Everyone but Sinon said "Có". */
const PRESENT_IDS = ['kirito', 'asuna', 'klein'];

/** Match 1: Kirito and Asuna in team 1, Klein in team 2. Match 2: Kirito alone in team 2. */
const MATCHES: MatchFormation[] = [
  {
    slots: {
      'team-1-pos-1': 'kirito',
      'team-1-pos-2': 'asuna',
      'team-2-pos-1': 'klein',
      'team-2-pos-2': 'sinon',
    },
    notes: { 'team-1-pos-1': 'tank', 'team-1-pos-3': 'giữ chỗ' },
  },
  { slots: { 'team-2-pos-1': 'kirito' }, notes: {} },
];

interface BuildOptions {
  found?: BattleSession | null;
  matches?: MatchFormation[];
  teamNames?: Record<string, string>;
  presentIds?: string[];
}

/**
 * Builds the service with every dependency replaced by a mock.
 * @param options - What the mocks return; the defaults are a closed two-match day
 * @returns The service together with the mocks to assert on
 */
function build(options: BuildOptions = {}) {
  const battleSessions = {
    findById: jest
      .fn()
      .mockResolvedValue(
        options.found === undefined ? session() : options.found,
      ),
  };
  const teamBuilder = {
    getSavedFormation: jest.fn().mockResolvedValue({
      matches: options.matches ?? MATCHES,
      teamNames: options.teamNames ?? { '1': 'Hổ Báo' },
    }),
  };
  const attendance = {
    getRecordsForSessions: jest.fn().mockResolvedValue(
      (options.presentIds ?? PRESENT_IDS).map((characterId) => ({
        characterId,
        sessionId: 'session-1',
        isPresent: true,
      })),
    ),
  };
  const characters = { listRows: jest.fn().mockResolvedValue(MEMBERS) };
  const rest = {
    openDm: jest.fn((userId: string) => Promise.resolve(`dm-${userId}`)),
    postMessage: jest.fn().mockResolvedValue(undefined),
  };

  const service = new TeamNoticeService(
    battleSessions as never,
    teamBuilder as never,
    attendance as never,
    characters as never,
    rest as never,
  );

  return { service, battleSessions, rest };
}

/** The text of every message sent, in send order, with the DM channel it went to. */
function sent(rest: ReturnType<typeof build>['rest']) {
  return rest.postMessage.mock.calls.map(
    ([channelId, payload]: [string, { content: string }]) => ({
      channelId,
      content: payload.content,
    }),
  );
}

describe('TeamNoticeService.notifyMembers', () => {
  it('không tìm thấy ngày thì từ chối, không nhắn ai', async () => {
    const { service, rest } = build({ found: null });

    await expect(service.notifyMembers('không-có')).rejects.toThrow(
      NotFoundException,
    );
    expect(rest.openDm).not.toHaveBeenCalled();
  });

  it('ngày chưa đóng điểm danh thì từ chối, không nhắn ai', async () => {
    const { service, rest } = build({
      found: session({ isAttendanceClosed: false }),
    });

    await expect(service.notifyMembers('session-1')).rejects.toThrow(
      BadRequestException,
    );
    expect(rest.openDm).not.toHaveBeenCalled();
  });

  it('mỗi người có điểm danh Có và có Discord ID nhận một DM cho mỗi trận họ có tên', async () => {
    const { service, rest } = build();

    await service.notifyMembers('session-1');

    expect(rest.openDm.mock.calls.map(([id]) => id)).toEqual([
      'd-kirito',
      'd-asuna',
      'd-kirito',
    ]);
    expect(sent(rest).map((message) => message.channelId)).toEqual([
      'dm-d-kirito',
      'dm-d-asuna',
      'dm-d-kirito',
    ]);
  });

  it('DM nói đúng trận, đúng team và đánh dấu người nhận', async () => {
    const { service, rest } = build();

    await service.notifyMembers('session-1');

    const [firstMatch, , secondMatch] = sent(rest);

    expect(firstMatch.content).toContain('Trận 1/2');
    expect(firstMatch.content).toContain('Bạn ở **Hổ Báo** (team 1)');
    expect(firstMatch.content).toContain('1. **Kirito** ← bạn - tank');
    expect(firstMatch.content).toContain('2. Asuna');
    expect(firstMatch.content).toContain('3. (trống) - giữ chỗ');
    expect(secondMatch.content).toContain('Trận 2/2');
    expect(secondMatch.content).toContain('Bạn ở **Team 2**');
  });

  it('người đã xếp mà không có điểm danh Có vào nhóm notPresent, không nhắn', async () => {
    const { service, rest } = build();

    const report = await service.notifyMembers('session-1');

    expect(report.notPresent).toEqual([
      { characterId: 'sinon', name: 'Sinon', matchIndex: 1 },
    ]);
    expect(rest.openDm).not.toHaveBeenCalledWith('d-sinon');
  });

  it('người chưa có Discord ID vào nhóm missingDiscordId, không nhắn', async () => {
    const { service, rest } = build();

    const report = await service.notifyMembers('session-1');

    expect(report.missingDiscordId).toEqual([
      { characterId: 'klein', name: 'Klein', matchIndex: 1 },
    ]);
    expect(rest.openDm).toHaveBeenCalledTimes(3);
  });

  it('báo cáo đếm đủ: đã nhắn và tổng', async () => {
    const { service } = build();

    const report = await service.notifyMembers('session-1');

    expect(report).toEqual({
      sentCount: 3,
      totalCount: 5,
      blocked: [],
      missingDiscordId: [
        { characterId: 'klein', name: 'Klein', matchIndex: 1 },
      ],
      notPresent: [{ characterId: 'sinon', name: 'Sinon', matchIndex: 1 }],
      unsent: [],
    });
  });

  it('ngày chưa xếp ai thì không nhắn và báo cáo rỗng', async () => {
    const { service, rest } = build({ matches: [] });

    const report = await service.notifyMembers('session-1');

    expect(report.totalCount).toBe(0);
    expect(rest.openDm).not.toHaveBeenCalled();
  });

  it('bỏ qua ô có slot id không đọc được thay vì ném', async () => {
    const { service, rest } = build({
      matches: [{ slots: { 'team-99-pos-1': 'kirito' }, notes: {} }],
    });

    const report = await service.notifyMembers('session-1');

    expect(report.totalCount).toBe(0);
    expect(rest.openDm).not.toHaveBeenCalled();
  });
});
