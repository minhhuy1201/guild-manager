import { DiscordApiError, DiscordRestClient } from '../discord-rest';

const CONFIG = { get: () => 'bot-token-value' } as never;

/**
 * Replace global fetch with a stub for one test.
 * @param response - What fetch should resolve to
 * @returns The jest mock, for assertions
 */
function stubFetch(response: { ok: boolean; status?: number; text?: string }) {
  const mock = jest.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? 200,
    text: () => Promise.resolve(response.text ?? ''),
    json: () => Promise.resolve(JSON.parse(response.text ?? 'null')),
  });

  global.fetch = mock as never;

  return mock;
}

describe('DiscordRestClient', () => {
  it('gửi payload tới đúng channel, kèm bot token', async () => {
    const fetchMock = stubFetch({ ok: true });
    const client = new DiscordRestClient(CONFIG);

    await client.postMessage('424242', { content: 'chào' });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      { method: string; headers: Record<string, string>; body: string },
    ];

    expect(url).toBe('https://discord.com/api/v10/channels/424242/messages');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bot bot-token-value');
    expect(JSON.parse(init.body)).toEqual({ content: 'chào' });
  });

  it('ném kèm status khi Discord từ chối', async () => {
    stubFetch({ ok: false, status: 403, text: '{"message":"Missing Access"}' });
    const client = new DiscordRestClient(CONFIG);

    await expect(
      client.postMessage('424242', { content: 'chào' }),
    ).rejects.toThrow('403');
  });

  // "The nudge never arrived" is unanswerable if the log holds nothing but a status code.
  it('mang theo thân lỗi để log đọc được nguyên nhân', async () => {
    stubFetch({ ok: false, status: 403, text: '{"message":"Missing Access"}' });
    const client = new DiscordRestClient(CONFIG);

    await expect(
      client.postMessage('424242', { content: 'chào' }),
    ).rejects.toThrow('Missing Access');
  });
});

describe('DiscordRestClient.postMessageWithFiles', () => {
  it('gửi multipart: payload_json cùng từng file, và khai báo attachments', async () => {
    const fetchMock = stubFetch({ ok: true });
    const client = new DiscordRestClient(CONFIG);

    await client.postMessageWithFiles('424242', { content: 'đội hình' }, [
      {
        filename: 'doi-hinh-1.webp',
        bytes: new Uint8Array([1, 2, 3]),
        contentType: 'image/webp',
      },
    ]);

    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      { headers: Record<string, string>; body: FormData },
    ];

    expect(url).toBe('https://discord.com/api/v10/channels/424242/messages');
    expect(init.body).toBeInstanceOf(FormData);
    expect(JSON.parse(init.body.get('payload_json') as string)).toEqual({
      content: 'đội hình',
      attachments: [{ id: 0, filename: 'doi-hinh-1.webp' }],
    });
    expect(init.body.get('files[0]')).toBeInstanceOf(Blob);
  });

  // Setting Content-Type by hand loses the boundary string fetch generates, and Discord rejects the
  // whole message.
  it('không tự đặt Content-Type cho multipart', async () => {
    const fetchMock = stubFetch({ ok: true });
    const client = new DiscordRestClient(CONFIG);

    await client.postMessageWithFiles('424242', { content: 'x' }, [
      {
        filename: 'a.webp',
        bytes: new Uint8Array([1]),
        contentType: 'image/webp',
      },
    ]);

    const [, init] = fetchMock.mock.calls[0] as [
      string,
      { headers: Record<string, string> },
    ];

    expect(init.headers.Authorization).toBe('Bot bot-token-value');
    expect(init.headers['Content-Type']).toBeUndefined();
  });

  it('ném kèm status và thân lỗi khi Discord từ chối', async () => {
    stubFetch({
      ok: false,
      status: 413,
      text: '{"message":"Payload too large"}',
    });
    const client = new DiscordRestClient(CONFIG);

    await expect(
      client.postMessageWithFiles('424242', { content: 'x' }, [
        {
          filename: 'a.webp',
          bytes: new Uint8Array([1]),
          contentType: 'image/webp',
        },
      ]),
    ).rejects.toThrow(/413.*Payload too large/s);
  });
});

describe('DiscordRestClient.openDm', () => {
  it('mở DM với đúng người và trả về id channel', async () => {
    const fetchMock = stubFetch({ ok: true, text: '{"id":"dm-777"}' });
    const client = new DiscordRestClient(CONFIG);

    await expect(client.openDm('1234')).resolves.toBe('dm-777');

    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      { method: string; headers: Record<string, string>; body: string },
    ];

    expect(url).toBe('https://discord.com/api/v10/users/@me/channels');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bot bot-token-value');
    expect(JSON.parse(init.body)).toEqual({ recipient_id: '1234' });
  });

  it('ném lỗi mang mã Discord khi người đó chặn DM', async () => {
    stubFetch({
      ok: false,
      status: 403,
      text: '{"code":50007,"message":"Cannot send messages to this user"}',
    });
    const client = new DiscordRestClient(CONFIG);

    await expect(client.openDm('1234')).rejects.toMatchObject({
      status: 403,
      code: 50007,
      retryAfter: null,
    });
  });
});

describe('DiscordApiError', () => {
  it('đọc mã lỗi và thời gian chờ từ thân JSON', () => {
    const error = new DiscordApiError(
      429,
      '1',
      '{"message":"You are being rate limited.","retry_after":1.5,"global":false}',
    );

    expect(error.code).toBeNull();
    expect(error.retryAfter).toBe(1.5);
  });

  it('để null khi thân lỗi không phải JSON', () => {
    const error = new DiscordApiError(502, '1', '<html>Bad Gateway</html>');

    expect(error.code).toBeNull();
    expect(error.retryAfter).toBeNull();
  });

  it('bỏ qua trường sai kiểu thay vì tin nó', () => {
    const error = new DiscordApiError(
      400,
      '1',
      '{"code":"50007","retry_after":"soon"}',
    );

    expect(error.code).toBeNull();
    expect(error.retryAfter).toBeNull();
  });
});

describe('DiscordRestClient - giới hạn thời gian chờ', () => {
  it('openDm và postMessage mang AbortSignal để một request treo không giữ cả function', async () => {
    const fetchMock = stubFetch({ ok: true, text: '{"id":"dm-1"}' });
    const client = new DiscordRestClient(CONFIG);

    await client.openDm('1234');
    await client.postMessage('dm-1', { content: 'x' });

    for (const [, init] of fetchMock.mock.calls as [string, RequestInit][]) {
      expect(init.signal).toBeInstanceOf(AbortSignal);
    }
  });
});
