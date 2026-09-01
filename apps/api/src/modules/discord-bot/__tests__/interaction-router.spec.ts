import { INTERACTION_RESPONSE_TYPE } from '../discord.constants';
import { routeInteraction } from '../interaction-router';

describe('routeInteraction', () => {
  it('trả PONG cho gói PING', () => {
    expect(routeInteraction({ type: 1 })).toEqual({
      type: INTERACTION_RESPONSE_TYPE.pong,
    });
  });

  it('gọi đúng lệnh theo tên', () => {
    const reply = routeInteraction({ type: 2, data: { name: 'ping' } });

    expect(reply).toEqual({
      type: INTERACTION_RESPONSE_TYPE.channelMessageWithSource,
      data: { content: 'Pong! Bot đang chạy.' },
    });
  });

  it('ném lỗi nêu tên lệnh khi lệnh chưa có trong registry', () => {
    // Trả 200 rỗng thì Discord hiện "ứng dụng không phản hồi" và không ai biết vì sao. Ném lỗi để
    // nó vào log kèm request id.
    expect(() =>
      routeInteraction({ type: 2, data: { name: 'diem-danh' } }),
    ).toThrow('diem-danh');
  });
});
