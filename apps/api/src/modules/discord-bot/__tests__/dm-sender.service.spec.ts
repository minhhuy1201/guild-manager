import { Logger } from '@nestjs/common';

import { Clock } from '../../../common';
import { DiscordApiError } from '../discord-rest';
import { DmSenderService } from '../dm-sender.service';
import type { DmRecipient } from '../dm-sender.service';

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

const BLOCKED = new DiscordApiError(
  403,
  'user:d-b',
  '{"code":50007,"message":"Cannot send messages to this user"}',
);
const TOO_FAST = new DiscordApiError(
  400,
  'user:d-b',
  '{"code":40003,"message":"You are opening direct messages too fast"}',
);

/**
 * A 429, with or without a wait.
 * @param seconds - The `retry_after` Discord answers with, omitted for a 429 that does not say
 * @returns The error
 */
function rateLimited(seconds?: number): DiscordApiError {
  const retry = seconds === undefined ? '' : `,"retry_after":${seconds}`;

  return new DiscordApiError(
    429,
    'user:d-b',
    `{"message":"You are being rate limited."${retry}}`,
  );
}

/**
 * Three recipients a, b, c; tests make b misbehave.
 * @returns The recipients
 */
function recipients(): DmRecipient[] {
  return ['a', 'b', 'c'].map((id) => ({
    discordId: `d-${id}`,
    payload: { content: `hello ${id}` },
  }));
}

/**
 * Builds the service over a mocked REST client.
 * @returns The service with the mocks to assert on
 */
function build() {
  const rest = {
    openDm: jest.fn((userId: string) => Promise.resolve(`dm-${userId}`)),
    postMessage: jest.fn().mockResolvedValue(undefined),
    postMessageWithFiles: jest.fn().mockResolvedValue(undefined),
  };
  const clock = new SteppingClock();

  return {
    service: new DmSenderService(rest as never, clock),
    rest,
    clock,
  };
}

/**
 * Make the next `openDm` for a recipient reject with each given error in turn.
 * @param rest - The mocked REST client
 * @param discordId - Whose DM fails
 * @param errors - What each successive attempt rejects with
 */
function failFor(
  rest: ReturnType<typeof build>['rest'],
  discordId: string,
  ...errors: Error[]
) {
  const pending = [...errors];

  rest.openDm.mockImplementation((userId: string) => {
    const error = userId === discordId ? pending.shift() : undefined;

    return error ? Promise.reject(error) : Promise.resolve(`dm-${userId}`);
  });
}

/** How many times a recipient's DM was opened. */
function opens(rest: ReturnType<typeof build>['rest'], discordId: string) {
  return rest.openDm.mock.calls.filter(([id]) => id === discordId).length;
}

describe('DmSenderService.sendAll', () => {
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
  async function run(service: DmSenderService) {
    const pending = service.sendAll(recipients());

    await jest.runAllTimersAsync();

    return pending;
  }

  it('gửi tuần tự, mỗi người một tin vào DM của họ, trả kết quả theo thứ tự', async () => {
    const { service, rest } = build();

    const results = await run(service);

    expect(results).toEqual(['sent', 'sent', 'sent']);
    expect(rest.postMessage.mock.calls).toEqual([
      ['dm-d-a', { content: 'hello a' }],
      ['dm-d-b', { content: 'hello b' }],
      ['dm-d-c', { content: 'hello c' }],
    ]);
  });

  it('có file thì gửi qua upload kèm đúng file, không gửi text riêng', async () => {
    const { service, rest } = build();
    const file = {
      filename: 'x.webp',
      contentType: 'image/webp',
      bytes: new Uint8Array(),
    };

    const results = await service.sendAll([
      { discordId: 'd-a', payload: { content: 'hi' }, files: [file] },
    ]);

    expect(results).toEqual(['sent']);
    expect(rest.postMessageWithFiles).toHaveBeenCalledWith(
      'dm-d-a',
      { content: 'hi' },
      [file],
    );
    expect(rest.postMessage).not.toHaveBeenCalled();
  });

  it('danh sách rỗng thì không gọi Discord', async () => {
    const { service, rest } = build();

    expect(await service.sendAll([])).toEqual([]);
    expect(rest.openDm).not.toHaveBeenCalled();
  });

  it('người chặn DM (50007) là blocked, những người sau vẫn được gửi', async () => {
    const { service, rest } = build();
    failFor(rest, 'd-b', BLOCKED);

    expect(await run(service)).toEqual(['sent', 'blocked', 'sent']);
    expect(rest.postMessage).toHaveBeenCalledTimes(2);
  });

  it('429 thì chờ đúng retry_after rồi thử lại một lần', async () => {
    const { service, rest } = build();
    failFor(rest, 'd-b', rateLimited(0.5));

    const pending = service.sendAll(recipients());
    await jest.advanceTimersByTimeAsync(499);

    expect(opens(rest, 'd-b')).toBe(1);

    await jest.advanceTimersByTimeAsync(1);

    expect(await pending).toEqual(['sent', 'sent', 'sent']);
    expect(opens(rest, 'd-b')).toBe(2);
  });

  it('429 không nói retry_after thì chờ mặc định 1 giây', async () => {
    const { service, rest } = build();
    failFor(rest, 'd-b', rateLimited());

    const pending = service.sendAll(recipients());
    await jest.advanceTimersByTimeAsync(999);

    expect(opens(rest, 'd-b')).toBe(1);

    await jest.advanceTimersByTimeAsync(1);

    expect(await pending).toEqual(['sent', 'sent', 'sent']);
  });

  it('retry_after đúng 10 giây vẫn được chờ', async () => {
    const { service, rest } = build();
    failFor(rest, 'd-b', rateLimited(10));

    expect(await run(service)).toEqual(['sent', 'sent', 'sent']);
    expect(opens(rest, 'd-b')).toBe(2);
  });

  it('429 hai lần liên tiếp thì unsent, không thử lần ba', async () => {
    const { service, rest } = build();
    failFor(rest, 'd-b', rateLimited(0.1), rateLimited(0.1));

    expect(await run(service)).toEqual(['sent', 'unsent', 'sent']);
    expect(opens(rest, 'd-b')).toBe(2);
  });

  it('retry_after quá dài thì không chờ, unsent ngay', async () => {
    const { service, rest } = build();
    failFor(rest, 'd-b', rateLimited(600));

    expect(await run(service)).toEqual(['sent', 'unsent', 'sent']);
    expect(opens(rest, 'd-b')).toBe(1);
  });

  it('mở DM quá nhanh (40003) thì dừng hẳn: người đó và mọi người còn lại là unsent', async () => {
    const { service, rest } = build();
    failFor(rest, 'd-b', TOO_FAST);

    expect(await run(service)).toEqual(['sent', 'unsent', 'unsent']);
    expect(rest.openDm).toHaveBeenCalledTimes(2);
  });

  it('40003 để lại một dòng log', async () => {
    const { service, rest } = build();
    failFor(rest, 'd-b', TOO_FAST);

    await run(service);

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('40003'));
  });

  it('lỗi 5xx là unsent, ghi log kèm thân lỗi, những người sau vẫn được gửi', async () => {
    const { service, rest } = build();
    failFor(rest, 'd-b', new DiscordApiError(502, 'user:d-b', 'Bad Gateway'));

    expect(await run(service)).toEqual(['sent', 'unsent', 'sent']);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Bad Gateway'));
  });

  it('lỗi mạng (không phải DiscordApiError) cũng là unsent', async () => {
    const { service, rest } = build();
    failFor(rest, 'd-b', new TypeError('fetch failed'));

    expect(await run(service)).toEqual(['sent', 'unsent', 'sent']);
  });
});

describe('DmSenderService.sendAll - ngân sách thời gian', () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /** Make every DM take a fixed time by moving the clock forward on each `openDm`. */
  function slowDms(built: ReturnType<typeof build>, secondsPerDm: number) {
    built.rest.openDm.mockImplementation((id: string) => {
      built.clock.advance(secondsPerDm * 1000);

      return Promise.resolve(`dm-${id}`);
    });
  }

  it('quá 220 giây thì dừng gửi, phần còn lại là unsent', async () => {
    const built = build();
    slowDms(built, 150);

    const results = await built.service.sendAll(recipients());

    expect(results).toEqual(['sent', 'sent', 'unsent']);
    expect(built.rest.openDm).toHaveBeenCalledTimes(2);
  });

  it('ghi log warn đúng một lần khi hết thời gian', async () => {
    const built = build();
    slowDms(built, 150);

    await built.service.sendAll([...recipients(), ...recipients()]);

    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('chạy nhanh thì không bị cắt', async () => {
    const built = build();
    slowDms(built, 1);

    expect(await built.service.sendAll(recipients())).toEqual([
      'sent',
      'sent',
      'sent',
    ]);
    expect(warn).not.toHaveBeenCalled();
  });
});
