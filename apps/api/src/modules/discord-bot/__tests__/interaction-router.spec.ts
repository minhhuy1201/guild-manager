import { ANNOUNCEMENT_ATTENDANCE_ID } from '../custom-id';
import { INTERACTION_RESPONSE_TYPE, MESSAGE_FLAG } from '../discord.constants';
import { InteractionRouter } from '../interaction-router';

/** Every button test below lands on this one sentence, so it is written once. */
const NOT_LINKED =
  'Bạn chưa được gán nhân vật nào. Nhờ admin thêm Discord ID của bạn.';

/**
 * Build a router over stubbed collaborators.
 * @param resolve - What ActorResolver.resolve returns; the /ping path never reaches it
 * @returns The router under test
 */
function makeRouter(resolve: unknown = null): InteractionRouter {
  return new InteractionRouter(
    {} as never,
    {} as never,
    {} as never,
    { resolve: jest.fn().mockResolvedValue(resolve) } as never,
    { get: jest.fn().mockReturnValue('') } as never,
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

  it('lệnh chưa có trong registry thì báo lỗi chung và ghi log', async () => {
    // Trước đây lỗi thoát ra thành 500. Giờ Discord phải nhận 200 kèm một câu, nếu không nó chỉ
    // hiện "ứng dụng không phản hồi" — chi tiết vẫn nằm nguyên trong log của router.
    const reply = await makeRouter().route({
      type: 2,
      data: { name: 'khong-ton-tai' },
    });

    expect(reply).toEqual({
      type: INTERACTION_RESPONSE_TYPE.channelMessageWithSource,
      data: {
        content: 'Có lỗi xảy ra. Thử lại sau hoặc điểm danh trên web.',
        flags: MESSAGE_FLAG.ephemeral,
      },
    });
  });

  it('nút trên thông báo mở một message riêng, không ghi đè thông báo chung', async () => {
    const reply = await makeRouter().route({
      type: 3,
      data: { custom_id: ANNOUNCEMENT_ATTENDANCE_ID },
      member: { user: { id: '111' } },
    });

    expect(reply).toEqual({
      type: INTERACTION_RESPONSE_TYPE.channelMessageWithSource,
      data: { content: NOT_LINKED, flags: MESSAGE_FLAG.ephemeral },
    });
  });

  it('nút trên bảng điểm danh vẫn ghi đè chính message nó đang nằm', async () => {
    const reply = await makeRouter().route({
      type: 3,
      data: { custom_id: 'dd:session-1:char-1:1' },
      member: { user: { id: '111' } },
    });

    expect(reply).toEqual({
      type: INTERACTION_RESPONSE_TYPE.updateMessage,
      data: { content: NOT_LINKED },
    });
  });
});
