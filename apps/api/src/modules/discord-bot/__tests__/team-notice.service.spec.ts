import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import type { BattleSession, MatchFormation } from '@guild/shared/schemas';

import { DiscordApiError } from '../discord-rest';
import { Clock } from '../../../common';
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

/** A clock a test moves by hand, to make sending take as long as the test says. */
class SteppingClock extends Clock {
  private ms = Date.parse('2026-08-19T02:00:00.000Z');

  now(): Date {
    return new Date(this.ms);
  }

  /**
   * Let time pass.
   * @param ms - Milliseconds to move forward
   */
  advance(ms: number): void {
    this.ms += ms;
  }
}

/** The members the line-ups below place. `discordId` null = nobody entered it yet. */
const MEMBERS = [
  { id: 'kirito', name: 'Kirito', discordId: 'd-kirito' },
  { id: 'asuna', name: 'Asuna', discordId: 'd-asuna' },
  { id: 'klein', name: 'Klein', discordId: null },
  { id: 'sinon', name: 'Sinon', discordId: 'd-sinon' },
];

/** The guild war channel id the service reads from config. */
const CHANNEL_ID = '777000111';

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
    postMessageWithFiles: jest.fn().mockResolvedValue(undefined),
  };
  const config = { get: jest.fn().mockReturnValue(CHANNEL_ID) };
  const clock = new SteppingClock();

  const service = new TeamNoticeService(
    battleSessions as never,
    teamBuilder as never,
    attendance as never,
    characters as never,
    rest as never,
    config as never,
    clock,
  );

  return { service, battleSessions, rest, clock };
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

describe('TeamNoticeService.notifyMembers — lưu ý thêm', () => {
  it('mọi DM mang cùng lưu ý ngay dưới tiêu đề, cả hai trận', async () => {
    const { service, rest } = build();

    await service.notifyMembers('session-1', undefined, [], 'Mang giáp');

    const contents = sent(rest).map(({ content }) => content.split('\n'));

    expect(contents.length).toBeGreaterThan(1);
    for (const lines of contents) expect(lines[1]).toBe('> Mang giáp');
  });

  it('nhắn lại thu hẹp bằng notices vẫn mang lưu ý', async () => {
    const { service, rest } = build();

    await service.notifyMembers(
      'session-1',
      [{ characterId: 'kirito', matchIndex: 1 }],
      [],
      'Mang giáp',
    );

    expect(sent(rest).map(({ content }) => content.split('\n')[1])).toEqual([
      '> Mang giáp',
    ]);
  });

  it('không có lưu ý thì DM không có dòng quote', async () => {
    const { service, rest } = build();

    await service.notifyMembers('session-1');

    for (const { content } of sent(rest)) {
      expect(content.split('\n').some((line) => line.startsWith('>'))).toBe(
        false,
      );
    }
  });
});

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

  it('DM nói đúng trận và đúng team, kèm link channel bang chiến vì chưa có ảnh', async () => {
    const { service, rest } = build();

    await service.notifyMembers('session-1');

    const [firstMatch, , secondMatch] = sent(rest);

    expect(firstMatch.content).toContain('Trận 1/2');
    expect(firstMatch.content).toContain('Bạn ở **Hổ Báo** (team 1)');
    expect(firstMatch.content).toContain(
      `Xem đội hình trong <#${CHANNEL_ID}>.`,
    );
    expect(firstMatch.content).not.toContain('←');
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

/**
 * Make `openDm` fail for one Discord user and succeed for everyone else.
 * @param rest - The mocked REST client
 * @param userId - Discord id whose DM fails
 * @param failures - What to throw on each successive attempt for that user; later attempts succeed
 */
function failFor(
  rest: ReturnType<typeof build>['rest'],
  userId: string,
  ...failures: Error[]
): void {
  let attempt = 0;

  rest.openDm.mockImplementation((id: string) => {
    if (id !== userId || attempt >= failures.length) {
      return Promise.resolve(`dm-${id}`);
    }

    return Promise.reject(failures[attempt++]);
  });
}

const BLOCKED = new DiscordApiError(
  403,
  'user:d-asuna',
  '{"code":50007,"message":"Cannot send messages to this user"}',
);
const TOO_FAST = new DiscordApiError(
  400,
  'user:d-asuna',
  '{"code":40003,"message":"You are opening direct messages too fast"}',
);

/**
 * A 429 asking the caller to wait.
 * @param seconds - The `retry_after` Discord answers with
 * @returns The error
 */
function rateLimited(seconds: number): DiscordApiError {
  return new DiscordApiError(
    429,
    'user:d-asuna',
    `{"message":"You are being rate limited.","retry_after":${seconds}}`,
  );
}

/** A tiny webp data URL whose bytes are [1, 2, 3]. */
const IMAGE = 'data:image/webp;base64,AQID';

/** A different image, bytes [4, 5, 6], to tell two teams' files apart. */
const OTHER_IMAGE = 'data:image/webp;base64,BAUG';

describe('TeamNoticeService.notifyMembers - ảnh team', () => {
  it('người ở team có ảnh nhận DM qua upload kèm đúng ảnh của cặp (trận, team) của họ', async () => {
    const { service, rest } = build();

    await service.notifyMembers('session-1', undefined, [
      { matchIndex: 1, team: 1, image: IMAGE },
      { matchIndex: 2, team: 2, image: OTHER_IMAGE },
    ]);

    const calls = rest.postMessageWithFiles.mock.calls as [
      string,
      { content: string },
      { filename: string; bytes: Uint8Array }[],
    ][];

    expect(calls.map(([channelId]) => channelId)).toEqual([
      'dm-d-kirito',
      'dm-d-asuna',
      'dm-d-kirito',
    ]);
    expect(calls.map(([, , files]) => files[0].filename)).toEqual([
      'team-1-tran-1.webp',
      'team-1-tran-1.webp',
      'team-2-tran-2.webp',
    ]);
    expect([...calls[0][2][0].bytes]).toEqual([1, 2, 3]);
    expect([...calls[2][2][0].bytes]).toEqual([4, 5, 6]);
    expect(rest.postMessage).not.toHaveBeenCalled();
  });

  it('DM có ảnh không có dòng link channel', async () => {
    const { service, rest } = build();

    await service.notifyMembers('session-1', undefined, [
      { matchIndex: 1, team: 1, image: IMAGE },
    ]);

    const [, payload] = rest.postMessageWithFiles.mock.calls[0] as [
      string,
      { content: string },
    ];

    expect(payload.content).toContain('Bạn ở **Hổ Báo** (team 1)');
    expect(payload.content).not.toContain('<#');
  });

  it('team thiếu ảnh nhận text có link channel, team có ảnh vẫn nhận upload', async () => {
    const { service, rest } = build();

    await service.notifyMembers('session-1', undefined, [
      { matchIndex: 1, team: 1, image: IMAGE },
    ]);

    expect(rest.postMessageWithFiles).toHaveBeenCalledTimes(2);
    const [textOnly] = sent(rest);

    expect(sent(rest)).toHaveLength(1);
    expect(textOnly.channelId).toBe('dm-d-kirito');
    expect(textOnly.content).toContain(`<#${CHANNEL_ID}>`);
  });

  it('ảnh của cặp không có người nhận bị bỏ qua', async () => {
    const { service, rest } = build();

    const report = await service.notifyMembers('session-1', undefined, [
      { matchIndex: 1, team: 7, image: IMAGE },
    ]);

    expect(rest.postMessageWithFiles).not.toHaveBeenCalled();
    expect(report.sentCount).toBe(3);
  });

  it('upload bị Discord từ chối thì vào unsent, không tự gửi lại bằng text', async () => {
    const { service, rest } = build();
    rest.postMessageWithFiles.mockRejectedValueOnce(
      new DiscordApiError(413, 'dm-d-kirito', 'Payload too large'),
    );
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    const report = await service.notifyMembers('session-1', undefined, [
      { matchIndex: 1, team: 1, image: IMAGE },
    ]);

    expect(report.unsent).toEqual([
      { characterId: 'kirito', name: 'Kirito', matchIndex: 1 },
    ]);
    // Only Kirito's match 2 notice (team 2, no image) went out as text.
    expect(rest.postMessage).toHaveBeenCalledTimes(1);
    jest.restoreAllMocks();
  });

  it('nhắn lại với notices và teamImages gửi đúng ảnh cho đúng người', async () => {
    const { service, rest } = build();

    const report = await service.notifyMembers(
      'session-1',
      [{ characterId: 'kirito', matchIndex: 2 }],
      [{ matchIndex: 2, team: 2, image: OTHER_IMAGE }],
    );

    const [channelId, , files] = rest.postMessageWithFiles.mock.calls[0] as [
      string,
      unknown,
      { filename: string }[],
    ];

    expect(channelId).toBe('dm-d-kirito');
    expect(files.map((file) => file.filename)).toEqual(['team-2-tran-2.webp']);
    expect(report.sentCount).toBe(1);
  });

  it('429 ở upload: chờ rồi gửi lại vẫn kèm ảnh', async () => {
    jest.useFakeTimers();
    const { service, rest } = build();
    rest.postMessageWithFiles.mockRejectedValueOnce(rateLimited(0.1));

    const pending = service.notifyMembers(
      'session-1',
      [{ characterId: 'kirito', matchIndex: 2 }],
      [{ matchIndex: 2, team: 2, image: OTHER_IMAGE }],
    );
    await jest.runAllTimersAsync();
    const report = await pending;

    expect(rest.postMessageWithFiles).toHaveBeenCalledTimes(2);
    expect(report.sentCount).toBe(1);
    jest.useRealTimers();
  });
});

describe('TeamNoticeService.notifyMembers - lỗi từ Discord', () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  /** Run a send to its end, moving fake time forward through any wait. */
  async function run(service: ReturnType<typeof build>['service']) {
    const pending = service.notifyMembers('session-1');

    await jest.runAllTimersAsync();

    return pending;
  }

  it('người chặn DM (50007) vào nhóm blocked, những người sau vẫn được nhắn', async () => {
    const { service, rest } = build();
    failFor(rest, 'd-asuna', BLOCKED);

    const report = await run(service);

    expect(report.blocked).toEqual([
      { characterId: 'asuna', name: 'Asuna', matchIndex: 1 },
    ]);
    expect(report.sentCount).toBe(2);
    expect(rest.postMessage).toHaveBeenCalledTimes(2);
  });

  it('bị giới hạn tốc độ (429) thì chờ đúng retry_after rồi thử lại một lần', async () => {
    const { service, rest } = build();
    failFor(rest, 'd-asuna', rateLimited(0.5));

    const pending = service.notifyMembers('session-1');
    await jest.advanceTimersByTimeAsync(499);

    expect(
      rest.openDm.mock.calls.filter(([id]) => id === 'd-asuna'),
    ).toHaveLength(1);

    await jest.advanceTimersByTimeAsync(1);
    const report = await pending;

    expect(
      rest.openDm.mock.calls.filter(([id]) => id === 'd-asuna'),
    ).toHaveLength(2);
    expect(report.sentCount).toBe(3);
    expect(report.unsent).toEqual([]);
  });

  it('429 hai lần liên tiếp thì vào nhóm unsent, không thử lần ba', async () => {
    const { service, rest } = build();
    failFor(rest, 'd-asuna', rateLimited(0.1), rateLimited(0.1));

    const report = await run(service);

    expect(report.unsent).toEqual([
      { characterId: 'asuna', name: 'Asuna', matchIndex: 1 },
    ]);
    expect(
      rest.openDm.mock.calls.filter(([id]) => id === 'd-asuna'),
    ).toHaveLength(2);
  });

  it('retry_after quá dài thì không chờ, vào nhóm unsent ngay', async () => {
    const { service, rest } = build();
    failFor(rest, 'd-asuna', rateLimited(600));

    const report = await run(service);

    expect(report.unsent).toHaveLength(1);
    expect(
      rest.openDm.mock.calls.filter(([id]) => id === 'd-asuna'),
    ).toHaveLength(1);
  });

  it('mở DM quá nhanh (40003) thì dừng hẳn: tin này và mọi tin còn lại vào unsent', async () => {
    const { service, rest } = build();
    failFor(rest, 'd-asuna', TOO_FAST);

    const report = await run(service);

    expect(report.sentCount).toBe(1);
    expect(report.unsent).toEqual([
      { characterId: 'asuna', name: 'Asuna', matchIndex: 1 },
      { characterId: 'kirito', name: 'Kirito', matchIndex: 2 },
    ]);
    expect(rest.openDm).toHaveBeenCalledTimes(2);
  });

  it('40003 để lại một dòng log', async () => {
    const { service, rest } = build();
    failFor(rest, 'd-asuna', TOO_FAST);

    await run(service);

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('40003'));
  });

  it('sau 40003 người chưa có ID hay chưa điểm danh vẫn được xếp đúng nhóm của họ', async () => {
    const { service, rest } = build();
    failFor(rest, 'd-asuna', TOO_FAST);

    const report = await run(service);

    expect(report.missingDiscordId).toHaveLength(1);
    expect(report.notPresent).toHaveLength(1);
    expect(report.totalCount).toBe(5);
  });

  it('lỗi 5xx vào nhóm unsent, ghi log kèm thân lỗi, những người sau vẫn được nhắn', async () => {
    const { service, rest } = build();
    failFor(
      rest,
      'd-asuna',
      new DiscordApiError(502, 'user:d-asuna', 'Bad Gateway'),
    );

    const report = await run(service);

    expect(report.unsent).toHaveLength(1);
    expect(report.sentCount).toBe(2);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Bad Gateway'));
  });

  it('lỗi mạng (không phải DiscordApiError) cũng vào nhóm unsent', async () => {
    const { service, rest } = build();
    failFor(rest, 'd-asuna', new TypeError('fetch failed'));

    const report = await run(service);

    expect(report.unsent).toHaveLength(1);
    expect(report.sentCount).toBe(2);
  });

  it('mỗi tin nằm đúng một chỗ: tổng các nhóm cộng đã nhắn bằng totalCount', async () => {
    const { service, rest } = build();
    failFor(rest, 'd-asuna', BLOCKED);

    const report = await run(service);
    const groups =
      report.blocked.length +
      report.missingDiscordId.length +
      report.notPresent.length +
      report.unsent.length;

    expect(report.sentCount + groups).toBe(report.totalCount);
  });
});

describe('TeamNoticeService.notifyMembers - nhắn lại theo danh sách', () => {
  it('chỉ nhắn đúng những cặp người và trận được chỉ định', async () => {
    const { service, rest } = build();

    const report = await service.notifyMembers('session-1', [
      { characterId: 'kirito', matchIndex: 2 },
    ]);

    expect(rest.openDm.mock.calls.map(([id]) => id)).toEqual(['d-kirito']);
    expect(sent(rest)[0].content).toContain('Trận 2/2');
    expect(report.sentCount).toBe(1);
    expect(report.totalCount).toBe(1);
  });

  it('người được chỉ định vẫn phải qua điều kiện: chưa điểm danh Có thì không nhắn', async () => {
    const { service, rest } = build();

    const report = await service.notifyMembers('session-1', [
      { characterId: 'sinon', matchIndex: 1 },
    ]);

    expect(rest.openDm).not.toHaveBeenCalled();
    expect(report.notPresent).toHaveLength(1);
  });

  it('cặp không có trong đội hình thì bỏ qua', async () => {
    const { service, rest } = build();

    const report = await service.notifyMembers('session-1', [
      { characterId: 'asuna', matchIndex: 2 },
    ]);

    expect(rest.openDm).not.toHaveBeenCalled();
    expect(report.totalCount).toBe(0);
  });

  it('danh sách rỗng thì không nhắn ai', async () => {
    const { service, rest } = build();

    const report = await service.notifyMembers('session-1', []);

    expect(rest.openDm).not.toHaveBeenCalled();
    expect(report.totalCount).toBe(0);
  });
});

describe('TeamNoticeService.notifyMembers - hết thời gian', () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * Make every DM take a fixed time by moving the clock forward on each `openDm`.
   * @param built - The built service and mocks
   * @param secondsPerDm - How long one DM takes
   */
  function slowDms(built: ReturnType<typeof build>, secondsPerDm: number) {
    built.rest.openDm.mockImplementation((id: string) => {
      built.clock.advance(secondsPerDm * 1000);

      return Promise.resolve(`dm-${id}`);
    });
  }

  it('quá ngân sách thời gian thì dừng gửi, phần còn lại vào unsent để nhắn lại', async () => {
    const built = build();
    slowDms(built, 150);

    const report = await built.service.notifyMembers('session-1');

    expect(report.sentCount).toBe(2);
    expect(report.unsent).toEqual([
      { characterId: 'kirito', name: 'Kirito', matchIndex: 2 },
    ]);
    expect(built.rest.openDm).toHaveBeenCalledTimes(2);
  });

  it('ghi log khi hết thời gian', async () => {
    const built = build();
    slowDms(built, 150);

    await built.service.notifyMembers('session-1');

    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('chạy nhanh thì không bị cắt', async () => {
    const built = build();
    slowDms(built, 1);

    const report = await built.service.notifyMembers('session-1');

    expect(report.unsent).toEqual([]);
    expect(report.sentCount).toBe(3);
  });
});
