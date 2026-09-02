import type { BattleSession } from '@guild/shared/schemas';

import { FixedClock } from '../../../common';
import { ReminderService } from '../reminder.service';

/** 09:00 giờ VN Thứ 4 02/09/2026 — sáng trước hạn 17:00 Thứ 5 03/09. */
const NOW = new Date('2026-09-02T02:00:00.000Z');

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
    // 17:00 giờ VN Thứ 5 03/09 — rơi vào "ngày mai" so với NOW.
    deadline: '2026-09-03T10:00:00.000Z',
    isDeadlinePassed: false,
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
  sessions?: BattleSession[];
  records?: { characterId: string; sessionId: string; isPresent?: boolean }[];
  members?: { id: string; name: string; discordId: string | null }[];
}

/**
 * Build the service around stubbed collaborators.
 * @param options - What each collaborator resolves to
 * @returns The service plus the postMessage mock, for assertions
 */
function makeService(options: Options = {}) {
  const postMessage = jest.fn().mockResolvedValue(undefined);

  const service = new ReminderService(
    {
      listByWeek: jest.fn().mockResolvedValue(options.sessions ?? [session()]),
    } as never,
    { getRecords: jest.fn().mockResolvedValue(options.records ?? []) } as never,
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
      get: jest
        .fn()
        .mockResolvedValue(
          options.channelId === undefined ? '424242' : options.channelId,
        ),
    } as never,
    { postMessage } as never,
    new FixedClock(NOW),
    { get: () => 'https://mmgh-nth.vercel.app' } as never,
  );

  return { service, postMessage };
}

describe('ReminderService.run', () => {
  it('gửi khi có ngày tới hạn và còn người thiếu', async () => {
    const { service, postMessage } = makeService();

    await expect(service.run()).resolves.toEqual({
      sent: true,
      sessionCount: 1,
      missingCount: 1,
    });
    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith('424242', expect.anything());
  });

  it('không gửi gì khi chưa cấu hình channel', async () => {
    const { service, postMessage } = makeService({ channelId: null });

    await expect(service.run()).resolves.toMatchObject({ sent: false });
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('không gửi gì khi không ngày nào tới hạn vào mai', async () => {
    const { service, postMessage } = makeService({
      // Hạn 17:00 Thứ 5 10/09 — còn hơn một ngày nữa.
      sessions: [session({ deadline: '2026-09-10T10:00:00.000Z' })],
    });

    await expect(service.run()).resolves.toMatchObject({
      sent: false,
      sessionCount: 0,
    });
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('không gửi gì khi mọi người đã trả lời', async () => {
    const { service, postMessage } = makeService({
      records: [{ characterId: 'meo-beo', sessionId: 'gw-2026-09-05' }],
    });

    await expect(service.run()).resolves.toMatchObject({
      sent: false,
      missingCount: 0,
    });
    expect(postMessage).not.toHaveBeenCalled();
  });

  // Có record là đã trả lời; isPresent chỉ là nội dung câu trả lời.
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

    await expect(service.run()).resolves.toMatchObject({ sent: false });
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

    await expect(service.run()).resolves.toMatchObject({
      sent: true,
      sessionCount: 1,
    });

    const [, payload] = postMessage.mock.calls[0] as [
      string,
      { embeds: { description: string }[] },
    ];

    expect(payload.embeds[0].description).toContain('Bang Chiến');
    expect(payload.embeds[0].description).not.toContain('Thứ 5 · 20:30');
  });

  it('đếm mỗi người một lần dù thiếu nhiều ngày', async () => {
    const { service } = makeService({
      sessions: [
        session(),
        session({ id: 's1', label: 'Thứ 5 · 20:30', isGuildWar: false }),
      ],
    });

    await expect(service.run()).resolves.toMatchObject({
      sessionCount: 2,
      missingCount: 1,
    });
  });
});
