import type { BattleSession } from '@guild/shared/schemas';

import { FixedClock } from '../../../common';
import type { MessagePayload } from '../commands/command.types';
import { DiscordApiError } from '../discord-rest';
import { reminderFailureText } from '../reminder-alert';
import type { DmResult } from '../dm-sender.service';
import { ReminderService } from '../reminder.service';

/** 09:00 Vietnam time on Friday 04/09/2026 - the morning of the Bang Chiến's 12:00 deadline. */
const NOW = new Date('2026-09-04T02:00:00.000Z');

/** 14:00 Vietnam time on Friday 04/09 - still the nudge day for the 12:00 deadline, now closed. */
const AFTERNOON = new Date('2026-09-04T07:00:00.000Z');

/**
 * A battle session carrying the fields the service reads.
 * @param overrides - Fields to change
 * @returns A session shaped like the API returns one
 */
function session(overrides: Partial<BattleSession> = {}): BattleSession {
  return {
    id: 'gw-2026-09-05',
    label: 'Thứ 7 · 20:00 · Bang Chiến',
    dateTime: '2026-09-05T13:00:00.000Z',
    // 12:00 Vietnam time on Friday 04/09 - from 12:00 onwards the nudge belongs to that morning.
    deadline: '2026-09-04T05:00:00.000Z',
    isAttendanceClosed: false,
    canReopenAttendance: false,
    isGuildWar: true,
    opponent: null,
    weekStart: '2026-08-30T17:00:00.000Z',
    attendanceCount: 0,
    matchCount: 2,
    formationMatchCount: 0,
    ...overrides,
  };
}

interface Options {
  adminChannelId?: string | null;
  adminChannelGet?: jest.Mock;
  sessions?: BattleSession[];
  records?: {
    characterId: string;
    sessionId: string;
    isPresent?: boolean;
    source?: 'answer' | 'leave' | 'auto';
  }[];
  members?: { id: string; name: string; discordId: string | null }[];
  now?: Date;
  /** What the DM sender answers per call; defaults to every recipient `sent`. */
  sendResults?: (count: number) => DmResult[];
  sendAllError?: Error;
}

/** One DM handed to the sender. */
interface SentDm {
  discordId: string;
  payload: MessagePayload;
}

/**
 * Build the service around stubbed collaborators.
 * @param options - What each collaborator resolves to
 * @returns The service plus the mocks, for assertions
 */
function makeService(options: Options = {}) {
  const postMessage = jest.fn().mockResolvedValue(undefined);
  const listByWeek = jest
    .fn()
    .mockResolvedValue(options.sessions ?? [session()]);
  // Both are stubbed so the suite reads the same records whichever one the service picks; which one
  // it must pick is asserted on its own.
  const getRecords = jest.fn().mockResolvedValue(options.records ?? []);
  const getRecordsForSessions = jest
    .fn()
    .mockResolvedValue(options.records ?? []);
  const get =
    options.adminChannelGet ??
    jest.fn(() =>
      Promise.resolve(
        options.adminChannelId === undefined ? '999' : options.adminChannelId,
      ),
    );
  const sendAll = jest.fn((recipients: SentDm[]) => {
    if (options.sendAllError) return Promise.reject(options.sendAllError);

    return Promise.resolve(
      options.sendResults
        ? options.sendResults(recipients.length)
        : recipients.map(() => 'sent' as const),
    );
  });

  const service = new ReminderService(
    { listByWeek } as never,
    { getRecords, getRecordsForSessions } as never,
    {
      listRows: jest
        .fn()
        .mockResolvedValue(
          options.members ?? [
            { id: 'meo-beo', name: 'Mèo Béo', discordId: '111' },
          ],
        ),
    } as never,
    { get } as never,
    { postMessage } as never,
    { sendAll } as never,
    new FixedClock(options.now ?? NOW),
    { get: () => 'https://mmgh-nth.vercel.app' } as never,
  );

  return {
    service,
    postMessage,
    sendAll,
    listByWeek,
    getRecords,
    getRecordsForSessions,
    get,
  };
}

/**
 * The DMs a mocked `sendAll` call received.
 * @param sendAll - The mock
 * @returns The recipients of the first call
 */
function recipientsOf(sendAll: jest.Mock): SentDm[] {
  return (sendAll.mock.calls[0] as [SentDm[]])[0];
}

const SENT_NONE_MISSED = { unlinked: [], blocked: [], unsent: [] };

describe('ReminderService.run', () => {
  it('gửi một DM cho người thiếu, không đăng vào channel nào', async () => {
    const { service, postMessage, sendAll } = makeService();

    await expect(service.run('today')).resolves.toEqual({
      status: 'sent',
      sessionCount: 1,
      missingCount: 1,
      deliveredCount: 1,
      ...SENT_NONE_MISSED,
    });
    expect(sendAll).toHaveBeenCalledTimes(1);
    expect(recipientsOf(sendAll)).toHaveLength(1);
    expect(recipientsOf(sendAll)[0].discordId).toBe('111');
    expect(postMessage).not.toHaveBeenCalled();
  });

  // The leave arrives as one more record from AttendanceService, so "has a record" stays the whole test.
  it('không nhắc người có lần nghỉ phủ trận, vẫn nhắc người khác', async () => {
    const { service, sendAll } = makeService({
      members: [
        { id: 'meo-beo', name: 'Mèo Béo', discordId: '111' },
        { id: 'cun', name: 'Cún', discordId: '222' },
      ],
      records: [
        {
          characterId: 'meo-beo',
          sessionId: 'gw-2026-09-05',
          isPresent: false,
          source: 'leave',
        },
      ],
    });

    await expect(service.run('today')).resolves.toMatchObject({
      status: 'sent',
      missingCount: 1,
    });
    expect(recipientsOf(sendAll).map((dm) => dm.discordId)).toEqual(['222']);
  });

  // Auto-attend arrives the same way as a leave: one more record from AttendanceService.
  it('không nhắc người đang bật tự động điểm danh, vẫn nhắc người khác', async () => {
    const { service, sendAll } = makeService({
      members: [
        { id: 'meo-beo', name: 'Mèo Béo', discordId: '111' },
        { id: 'cun', name: 'Cún', discordId: '222' },
      ],
      records: [
        {
          characterId: 'meo-beo',
          sessionId: 'gw-2026-09-05',
          isPresent: true,
          source: 'auto',
        },
      ],
    });

    await expect(service.run('today')).resolves.toMatchObject({
      status: 'sent',
      missingCount: 1,
    });
    expect(recipientsOf(sendAll).map((dm) => dm.discordId)).toEqual(['222']);
  });

  it('không gửi gì khi không ngày nào tới lượt nhắc hôm nay', async () => {
    const { service, sendAll } = makeService({
      // A 17:00 deadline on Thursday 10/09 - more than a day away.
      sessions: [session({ deadline: '2026-09-10T10:00:00.000Z' })],
    });

    await expect(service.run('today')).resolves.toEqual({
      status: 'nothing-due',
    });
    expect(sendAll).not.toHaveBeenCalled();
  });

  // The new rule nudges on the deadline day too, so running /nhac-diem-danh by hand in the
  // afternoon meets a deadline that has already passed.
  it('bỏ trận đã quá hạn dù hôm nay là ngày nhắc của nó', async () => {
    const { service, sendAll } = makeService({
      now: AFTERNOON,
      sessions: [
        session(),
        // 18:00 Vietnam time on Friday 04/09 - still open.
        session({
          id: 's1',
          label: 'Thứ 6 · 20:30',
          isGuildWar: false,
          deadline: '2026-09-04T11:00:00.000Z',
        }),
      ],
    });

    await expect(service.run('today')).resolves.toMatchObject({
      status: 'sent',
      sessionCount: 1,
    });
    const description =
      recipientsOf(sendAll)[0].payload.embeds?.[0].description;
    expect(description).not.toContain('Bang Chiến');
    expect(description).toContain('Thứ 6 · 20:30');
  });

  it('chỉ còn trận đã quá hạn thì không gửi gì', async () => {
    const { service, sendAll } = makeService({ now: AFTERNOON });

    await expect(service.run('today')).resolves.toEqual({
      status: 'nothing-due',
    });
    expect(sendAll).not.toHaveBeenCalled();
  });

  it('không gửi gì khi mọi người đã trả lời', async () => {
    const { service, sendAll } = makeService({
      records: [{ characterId: 'meo-beo', sessionId: 'gw-2026-09-05' }],
    });

    await expect(service.run('today')).resolves.toEqual({
      status: 'nothing-due',
    });
    expect(sendAll).not.toHaveBeenCalled();
  });

  // A record means they answered; isPresent is only what the answer said.
  it('người trả lời "Không" cũng tính là đã điểm danh', async () => {
    const { service, sendAll } = makeService({
      records: [
        {
          characterId: 'meo-beo',
          sessionId: 'gw-2026-09-05',
          isPresent: false,
        },
      ],
    });

    await expect(service.run('today')).resolves.toEqual({
      status: 'nothing-due',
    });
    expect(sendAll).not.toHaveBeenCalled();
  });

  it('bỏ ngày đã đủ người, giữ ngày còn thiếu', async () => {
    const { service, sendAll } = makeService({
      sessions: [
        session(),
        session({ id: 's1', label: 'Thứ 5 · 20:30', isGuildWar: false }),
      ],
      records: [{ characterId: 'meo-beo', sessionId: 's1' }],
    });

    await expect(service.run('today')).resolves.toMatchObject({
      status: 'sent',
      sessionCount: 1,
    });

    const description =
      recipientsOf(sendAll)[0].payload.embeds?.[0].description;
    expect(description).toContain('Bang Chiến');
    expect(description).not.toContain('Thứ 5 · 20:30');
  });

  it('bản ghi của người khác trong cùng ngày không tính là mình đã trả lời', async () => {
    const { service } = makeService({
      members: [
        { id: 'meo-beo', name: 'Mèo Béo', discordId: '111' },
        { id: 'cho-gay', name: 'Chó Gầy', discordId: '222' },
      ],
      records: [{ characterId: 'meo-beo', sessionId: 'gw-2026-09-05' }],
    });

    await expect(service.run('today')).resolves.toMatchObject({
      status: 'sent',
      missingCount: 1,
    });
  });

  it('một lượt nhắc chỉ suy ra tuần một lần', async () => {
    const { service, listByWeek, getRecords, getRecordsForSessions } =
      makeService({
        sessions: [
          session(),
          // A 17:00 deadline on Tuesday 08/09 - not yet due, but still inside the week being read.
          session({
            id: 's1',
            label: 'Thứ 5 · 20:30',
            isGuildWar: false,
            deadline: '2026-09-08T10:00:00.000Z',
          }),
        ],
      });

    await service.run('today');

    expect(listByWeek).toHaveBeenCalledTimes(1);
    expect(getRecords).not.toHaveBeenCalled();
    // The whole week, not just the due days: narrowing what is read is a separate change.
    expect(getRecordsForSessions).toHaveBeenCalledWith(['gw-2026-09-05', 's1']);
  });

  it('một người thiếu nhiều ngày nhận đúng một DM chứa mọi ngày thiếu của họ', async () => {
    const { service, sendAll } = makeService({
      members: [
        { id: 'meo-beo', name: 'Mèo Béo', discordId: '111' },
        { id: 'cun', name: 'Cún', discordId: '222' },
      ],
      sessions: [
        session(),
        session({ id: 's1', label: 'Thứ 5 · 20:30', isGuildWar: false }),
      ],
      // Cún answered the scrim, so only Mèo Béo is missing both days.
      records: [{ characterId: 'cun', sessionId: 's1' }],
    });

    await expect(service.run('today')).resolves.toMatchObject({
      sessionCount: 2,
      missingCount: 2,
      deliveredCount: 2,
    });

    const [meo, cun] = recipientsOf(sendAll);
    expect(recipientsOf(sendAll)).toHaveLength(2);
    expect(meo.discordId).toBe('111');
    expect(meo.payload.embeds?.[0].description).toContain('Bang Chiến');
    expect(meo.payload.embeds?.[0].description).toContain('Thứ 5 · 20:30');
    expect(cun.discordId).toBe('222');
    expect(cun.payload.embeds?.[0].description).toContain('Bang Chiến');
    expect(cun.payload.embeds?.[0].description).not.toContain('Thứ 5 · 20:30');
  });

  it('DM không nhắc tên người khác và không mention ai', async () => {
    const { service, sendAll } = makeService({
      members: [
        { id: 'meo-beo', name: 'Mèo Béo', discordId: '111' },
        { id: 'cun', name: 'Cún', discordId: '222' },
      ],
    });

    await service.run('today');

    const payload = JSON.stringify(recipientsOf(sendAll)[0].payload);
    expect(payload).not.toContain('Cún');
    expect(payload).not.toContain('<@');
    expect(recipientsOf(sendAll)[0].payload.allowed_mentions).toEqual({
      parse: [],
    });
  });

  it('phân loại người không nhận được: chưa liên kết, chặn DM, chưa gửi được', async () => {
    const { service, sendAll } = makeService({
      members: [
        { id: 'a', name: 'Mèo Béo', discordId: '111' },
        { id: 'b', name: 'Cún Con', discordId: '222' },
        { id: 'c', name: 'Chim Sẻ', discordId: null },
        { id: 'd', name: 'Gà Mờ', discordId: '444' },
        { id: 'e', name: 'Vịt Bầu', discordId: '555' },
      ],
      sendResults: () => ['sent', 'blocked', 'unsent', 'sent'],
    });

    await expect(service.run('today')).resolves.toEqual({
      status: 'sent',
      sessionCount: 1,
      missingCount: 5,
      deliveredCount: 2,
      unlinked: ['Chim Sẻ'],
      blocked: ['Cún Con'],
      unsent: ['Gà Mờ'],
    });
    // Chim Sẻ has no Discord ID, so there is nobody to hand to the sender.
    expect(recipientsOf(sendAll).map((dm) => dm.discordId)).toEqual([
      '111',
      '222',
      '444',
      '555',
    ]);
  });

  it('một người thiếu nhiều ngày chỉ tính một lần trong nhóm không nhận được', async () => {
    const { service } = makeService({
      sessions: [
        session(),
        session({ id: 's1', label: 'Thứ 5 · 20:30', isGuildWar: false }),
      ],
      members: [{ id: 'c', name: 'Chim Sẻ', discordId: null }],
    });

    await expect(service.run('today')).resolves.toMatchObject({
      missingCount: 1,
      deliveredCount: 0,
      unlinked: ['Chim Sẻ'],
    });
  });
});

describe('ReminderService.run - phạm vi cả tuần', () => {
  const sessions = [
    session(),
    // 13:00 Vietnam time on Saturday 05/09 - from 12:00 onwards the nudge day is that Saturday
    // morning, which is not today.
    session({
      id: 's1',
      label: 'Thứ 7 · 16:00',
      isGuildWar: false,
      deadline: '2026-09-05T06:00:00.000Z',
    }),
    // 12:00 Vietnam time on Wednesday 02/09 - past the deadline.
    session({
      id: 's2',
      label: 'Thứ 4 · 20:30',
      isGuildWar: false,
      deadline: '2026-09-02T05:00:00.000Z',
    }),
  ];

  it('nhắc cả trận chưa tới ngày nhắc, nhưng vẫn bỏ trận đã quá hạn', async () => {
    const { service, sendAll } = makeService({ sessions });

    await expect(service.run('week')).resolves.toMatchObject({
      status: 'sent',
      sessionCount: 2,
      missingCount: 1,
    });
    const description =
      recipientsOf(sendAll)[0].payload.embeds?.[0].description;
    expect(description).toContain('Thứ 7 · 16:00');
    expect(description).not.toContain('Thứ 4 · 20:30');
  });

  it('cùng dữ liệu đó, phạm vi hôm nay chỉ nhắc trận tới ngày nhắc', async () => {
    const { service } = makeService({ sessions });

    await expect(service.run('today')).resolves.toMatchObject({
      status: 'sent',
      sessionCount: 1,
    });
  });

  it('mọi trận trong tuần đã quá hạn thì không gửi gì', async () => {
    const { service, sendAll } = makeService({ sessions: [sessions[2]] });

    await expect(service.run('week')).resolves.toEqual({
      status: 'nothing-due',
    });
    expect(sendAll).not.toHaveBeenCalled();
  });
});

describe('ReminderService.runScheduled', () => {
  it('gửi trót lọt: không đăng gì vào kênh admin', async () => {
    const { service, postMessage } = makeService();

    await expect(service.runScheduled()).resolves.toMatchObject({
      status: 'sent',
    });
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('nothing-due: không đăng gì', async () => {
    const { service, postMessage } = makeService({ sessions: [] });

    await expect(service.runScheduled()).resolves.toEqual({
      status: 'nothing-due',
    });
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('có người không nhận được: đăng một tin vào kênh admin liệt kê ba nhóm', async () => {
    const { service, postMessage } = makeService({
      members: [
        { id: 'a', name: 'Mèo Béo', discordId: '111' },
        { id: 'b', name: 'Cún Con', discordId: '222' },
        { id: 'c', name: 'Chim Sẻ', discordId: null },
      ],
      sendResults: () => ['blocked', 'unsent'],
    });

    await expect(service.runScheduled()).resolves.toMatchObject({
      status: 'sent',
      deliveredCount: 0,
    });
    expect(postMessage).toHaveBeenCalledTimes(1);
    const [channelId, payload] = postMessage.mock.calls[0] as [
      string,
      { content: string },
    ];
    expect(channelId).toBe('999');
    expect(payload.content).toContain('Chim Sẻ');
    expect(payload.content).toContain('Mèo Béo');
    expect(payload.content).toContain('Cún Con');
  });

  it('có người không nhận được mà thiếu kênh admin: chỉ log, vẫn trả outcome', async () => {
    const { service, postMessage } = makeService({
      adminChannelId: null,
      sendResults: () => ['blocked'],
    });

    await expect(service.runScheduled()).resolves.toMatchObject({
      status: 'sent',
    });
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('run ném: báo rồi ném lại chính lỗi gốc', async () => {
    const boom = new DiscordApiError(500, '1', '{}');
    const { service, postMessage } = makeService({ sendAllError: boom });

    await expect(service.runScheduled()).rejects.toBe(boom);
    expect(postMessage).toHaveBeenCalledWith('999', {
      content: reminderFailureText(),
    });
  });

  it('thiếu kênh admin: không gửi, vẫn ném lỗi gốc', async () => {
    const boom = new Error('boom');
    const { service, postMessage } = makeService({
      adminChannelId: null,
      sendAllError: boom,
    });

    await expect(service.runScheduled()).rejects.toBe(boom);
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('gửi tin báo cũng lỗi: lỗi ném ra vẫn là lỗi gốc', async () => {
    const boom = new Error('boom');
    const { service, postMessage } = makeService({ sendAllError: boom });
    postMessage.mockRejectedValue(new Error('discord down'));

    await expect(service.runScheduled()).rejects.toBe(boom);
  });

  it('đọc kênh admin ném: lỗi ném ra vẫn là lỗi gốc', async () => {
    const boom = new Error('boom');
    const adminChannelGet = jest.fn(() => Promise.reject(new Error('db down')));
    const { service } = makeService({ adminChannelGet, sendAllError: boom });

    await expect(service.runScheduled()).rejects.toBe(boom);
  });

  it('có người không nhận được mà đọc kênh admin ném: vẫn trả outcome', async () => {
    const adminChannelGet = jest.fn(() => Promise.reject(new Error('db down')));
    const { service } = makeService({
      adminChannelGet,
      sendResults: () => ['blocked'],
    });

    await expect(service.runScheduled()).resolves.toMatchObject({
      status: 'sent',
    });
  });
});
