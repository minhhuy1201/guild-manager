import { INTERACTION_RESPONSE_TYPE } from '../discord.constants';
import { InteractionRouter } from '../interaction-router';

/**
 * Build a router over stubbed collaborators. The /ping path touches none of them.
 * @returns The router under test
 */
function makeRouter(): InteractionRouter {
  return new InteractionRouter(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
}

describe('InteractionRouter', () => {
  it('trả PONG cho gói PING', async () => {
    await expect(makeRouter().route({ type: 1 })).resolves.toEqual({
      type: INTERACTION_RESPONSE_TYPE.pong,
    });
  });

  it('gọi đúng lệnh theo tên', async () => {
    const reply = await makeRouter().route({ type: 2, data: { name: 'ping' } });

    expect(reply).toEqual({
      type: INTERACTION_RESPONSE_TYPE.channelMessageWithSource,
      data: { content: 'Pong! Bot đang chạy.' },
    });
  });

  it('ném lỗi nêu tên lệnh khi lệnh chưa có trong registry', async () => {
    // Trả 200 rỗng thì Discord hiện "ứng dụng không phản hồi" và không ai biết vì sao. Ném lỗi để
    // nó vào log kèm request id.
    await expect(
      makeRouter().route({ type: 2, data: { name: 'khong-ton-tai' } }),
    ).rejects.toThrow('khong-ton-tai');
  });
});
