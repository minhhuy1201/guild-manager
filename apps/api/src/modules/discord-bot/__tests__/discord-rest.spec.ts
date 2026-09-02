import { DiscordRestClient } from '../discord-rest';

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

  // "Tin nhắc không tới" là câu hỏi không trả lời được nếu log chỉ có mã lỗi.
  it('mang theo thân lỗi để log đọc được nguyên nhân', async () => {
    stubFetch({ ok: false, status: 403, text: '{"message":"Missing Access"}' });
    const client = new DiscordRestClient(CONFIG);

    await expect(
      client.postMessage('424242', { content: 'chào' }),
    ).rejects.toThrow('Missing Access');
  });
});
