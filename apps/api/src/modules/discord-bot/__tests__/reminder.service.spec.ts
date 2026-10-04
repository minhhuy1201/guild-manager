import type { BattleSession } from '@guild/shared/schemas';

import { FixedClock } from '../../../common';
import type { MessagePayload } from '../commands/command.types';
import { DiscordApiError } from '../discord-rest';
import {
  REMINDER_NO_CHANNEL_ALERT,
  reminderFailureText,
} from '../reminder-alert';
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
  channelId?: string | null;
  adminChannelId?: string | null;
  adminChannelGet?: jest.Mock;
  sessions?: BattleSession[];
  records?: {
    characterId: string;
    sessionId: string;
    isPresent?: boolean;
    source?: 'answer' | 'leave';
  }[];
  members?: { id: string; name: string; discordId: string | null }[];
  now?: Date;
}

/**
 * Build the service around stubbed collaborators.
 * @param options - What each collaborator resolves to
 * @returns The service plus the postMessage mock, for assertions
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
    {
      get:
        options.adminChannelGet ??
        jest.fn((purpose: string) =>
          Promise.resolve(
            purpose === 'ADMIN_ALERT'
              ? options.adminChannelId === undefined
                ? '999'
                : options.adminChannelId
              : options.channelId === undefined
                ? '424242'
                : options.channelId,
          ),
        ),
    } as never,
    { postMessage } as never,
    new FixedClock(options.now ?? NOW),
    { get: () => 'https://mmgh-nth.vercel.app' } as never,
  );

  return {
    service,
    postMessage,
    listByWeek,
    getRecords,
    getRecordsForSessions,
  };
}

describe('ReminderService.run', () => {
  it('gửi khi có ngày tới hạn và còn người thiếu', async () => {
    const { service, postMessage } = makeService();

    await expect(service.run('today')).resolves.toEqual({
      status: 'sent',
      sessionCount: 1,
      missingCount: 1,
    });
    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith('424242', expect.anything());
  });

  // The leave arrives as one more record from AttendanceService, so "has a record" stays the whole test.
  it('không nhắc người có lần nghỉ phủ trận, vẫn nhắc người khác', async () => {
    const { service, postMessage } = makeService({
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
    const [, message] = postMessage.mock.calls[0] as [string, unknown];
    expect(JSON.stringify(message)).toContain('Cún');
    expect(JSON.stringify(message)).not.toContain('Mèo Béo');
  });

  it('không gửi gì khi chưa cấu hình channel', async () => {
    const { service, postMessage } = makeService({ channelId: null });

    await expect(service.run('today')).resolves.toEqual({
      status: 'no-channel',
    });
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('không gửi gì khi không ngày nào tới lượt nhắc hôm nay', async () => {
    const { service, postMessage } = makeService({
      // A 17:00 deadline on Thursday 10/09 - more than a day away.
      sessions: [session({ deadline: '2026-09-10T10:00:00.000Z' })],
    });

    await expect(service.run('today')).resolves.toEqual({
      status: 'nothing-due',
    });
    expect(postMessage).not.toHaveBeenCalled();
  });

  // The new rule nudges on the deadline day too, so running /nhac-diem-danh by hand in the
  // afternoon meets a deadline that has already passed.
  it('bỏ trận đã quá hạn dù hôm nay là ngày nhắc của nó', async () => {
    const { service, postMessage } = makeService({
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

    await expect(service.run('today')).resolves.toEqual({
      status: 'sent',
      sessionCount: 1,
      missingCount: 1,
    });
    const [, payload] = postMessage.mock.calls[0] as [string, MessagePayload];
    expect(payload.embeds?.[0].description).not.toContain('Bang Chiến');
  });

  it('chỉ còn trận đã quá hạn thì không gửi gì', async () => {
    const { service, postMessage } = makeService({ now: AFTERNOON });

    await expect(service.run('today')).resolves.toEqual({
      status: 'nothing-due',
    });
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('không gửi gì khi mọi người đã trả lời', async () => {
    const { service, postMessage } = makeService({
      records: [{ characterId: 'meo-beo', sessionId: 'gw-2026-09-05' }],
    });

    await expect(service.run('today')).resolves.toEqual({
      status: 'nothing-due',
    });
    expect(postMessage).not.toHaveBeenCalled();
  });

  // A record means they answered; isPresent is only what the answer said.
  it('người trả lời "Không" cũng tính là đã điểm danh', async () => {
    const { service, postMessage } = makeService({
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
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('bỏ ngày đã đủ người, giữ ngày còn thiếu', async () => {
    const { service, postMessage } = makeService({
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

    const [, payload] = postMessage.mock.calls[0] as [
      string,
      { embeds: { description: string }[] },
    ];

    expect(payload.embeds[0].description).toContain('Bang Chiến');
    expect(payload.embeds[0].description).not.toContain('Thứ 5 · 20:30');
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

  it('đếm mỗi người một lần dù thiếu nhiều ngày', async () => {
    const { service } = makeService({
      sessions: [
        session(),
        session({ id: 's1', label: 'Thứ 5 · 20:30', isGuildWar: false }),
      ],
    });

    await expect(service.run('today')).resolves.toMatchObject({
      sessionCount: 2,
      missingCount: 1,
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
    const { service, postMessage } = makeService({ sessions });

    await expect(service.run('week')).resolves.toEqual({
      status: 'sent',
      sessionCount: 2,
      missingCount: 1,
    });
    const [, payload] = postMessage.mock.calls[0] as [string, MessagePayload];
    expect(payload.embeds?.[0].description).toContain('Thứ 7 · 16:00');
    expect(payload.embeds?.[0].description).not.toContain('Thứ 4 · 20:30');
  });

  it('cùng dữ liệu đó, phạm vi hôm nay chỉ nhắc trận tới ngày nhắc', async () => {
    const { service } = makeService({ sessions });

    await expect(service.run('today')).resolves.toMatchObject({
      status: 'sent',
      sessionCount: 1,
    });
  });

  it('mọi trận trong tuần đã quá hạn thì không gửi gì', async () => {
    const { service, postMessage } = makeService({ sessions: [sessions[2]] });

    await expect(service.run('week')).resolves.toEqual({
      status: 'nothing-due',
    });
    expect(postMessage).not.toHaveBeenCalled();
  });
});

describe('ReminderService.runScheduled', () => {
  const adminCalls = (postMessage: jest.Mock): unknown[][] =>
    (postMessage.mock.calls as unknown[][]).filter(
      ([channelId]) => channelId === '999',
    );

  it('sent: không gửi tin báo', async () => {
    const { service, postMessage } = makeService();

    await expect(service.runScheduled()).resolves.toMatchObject({
      status: 'sent',
    });
    expect(adminCalls(postMessage)).toHaveLength(0);
  });

  it('nothing-due: không gửi tin báo', async () => {
    const { service, postMessage } = makeService({ sessions: [] });

    await expect(service.runScheduled()).resolves.toEqual({
      status: 'nothing-due',
    });
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('no-channel: báo vào kênh admin, trả outcome', async () => {
    const { service, postMessage } = makeService({ channelId: null });

    await expect(service.runScheduled()).resolves.toEqual({
      status: 'no-channel',
    });
    expect(postMessage).toHaveBeenCalledWith('999', {
      content: REMINDER_NO_CHANNEL_ALERT,
    });
  });

  it('run ném: báo rồi ném lại chính lỗi gốc', async () => {
    const boom = new DiscordApiError(403, '424242', '{}');
    const { service, postMessage } = makeService();
    postMessage.mockRejectedValueOnce(boom).mockResolvedValueOnce(undefined);

    await expect(service.runScheduled()).rejects.toBe(boom);
    expect(postMessage).toHaveBeenLastCalledWith('999', {
      content: reminderFailureText(boom),
    });
  });

  it('thiếu kênh admin: không gửi, vẫn ném lỗi gốc', async () => {
    const boom = new Error('boom');
    const { service, postMessage } = makeService({ adminChannelId: null });
    postMessage.mockRejectedValueOnce(boom);

    await expect(service.runScheduled()).rejects.toBe(boom);
    expect(adminCalls(postMessage)).toHaveLength(0);
  });

  it('gửi tin báo cũng lỗi: lỗi ném ra vẫn là lỗi gốc', async () => {
    const boom = new Error('boom');
    const { service, postMessage } = makeService();
    postMessage.mockRejectedValue(boom);

    await expect(service.runScheduled()).rejects.toBe(boom);
  });

  it('đọc kênh admin ném: lỗi ném ra vẫn là lỗi gốc', async () => {
    const boom = new Error('boom');
    const adminChannelGet = jest.fn((purpose: string) =>
      purpose === 'ADMIN_ALERT'
        ? Promise.reject(new Error('db down'))
        : Promise.resolve('424242'),
    );
    const { service, postMessage } = makeService({ adminChannelGet });
    postMessage.mockRejectedValueOnce(boom);

    await expect(service.runScheduled()).rejects.toBe(boom);
  });

  it('no-channel mà kênh admin ném: vẫn trả outcome', async () => {
    const adminChannelGet = jest.fn((purpose: string) =>
      purpose === 'ADMIN_ALERT'
        ? Promise.reject(new Error('db down'))
        : Promise.resolve(null),
    );
    const { service } = makeService({ adminChannelGet });

    await expect(service.runScheduled()).resolves.toEqual({
      status: 'no-channel',
    });
  });
});
