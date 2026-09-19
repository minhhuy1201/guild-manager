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
    const reply = await makeRouter().route({
      type: 2,
      channel_id: '424242',
      data: { name: 'ping' },
    });

    expect(reply).toEqual({
      type: INTERACTION_RESPONSE_TYPE.channelMessageWithSource,
      data: { content: 'Pong! Bot đang chạy.' },
    });
  });

  it('lệnh chưa có trong registry thì báo lỗi chung và ghi log', async () => {
    // Errors used to escape as a 500. Discord now has to receive a 200 with a sentence, or all it
    // shows is "the application did not respond" - the detail still sits in the router's log.
    const reply = await makeRouter().route({
      type: 2,
      channel_id: '424242',
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

  // This button appears on both /thong-bao and the attendance nudge - each one a message for the
  // whole guild, so updateMessage would let the first person to press it erase that message for
  // everyone.
  it('nút trên tin gửi cả bang mở một message riêng, không ghi đè tin đó', async () => {
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

  // The /diem-danh-ho board is a public message: refusing through updateMessage would let an
  // outsider wipe the channel's board, so a refusal is always private. The board is only redrawn
  // once the write succeeds.
  it('bấm nút mà bị từ chối thì nhận tin riêng, không ghi đè bảng', async () => {
    const reply = await makeRouter().route({
      type: 3,
      data: { custom_id: 'dd:session-1:char-1:1' },
      member: { user: { id: '111' } },
    });

    expect(reply).toEqual({
      type: INTERACTION_RESPONSE_TYPE.channelMessageWithSource,
      data: { content: NOT_LINKED, flags: MESSAGE_FLAG.ephemeral },
    });
  });

  it('đọc ba channel id của /chao-mung từ env đúng tên biến', async () => {
    // A misspelled variable name here breaks no build; it only shows up as <#undefined> in a
    // welcome already posted in public - so the name is pinned by a test.
    const get = jest.fn().mockImplementation((key: string) => `giá-trị:${key}`);
    const router = new InteractionRouter(
      {} as never,
      {} as never,
      {} as never,
      { resolve: jest.fn().mockResolvedValue(null) } as never,
      { get } as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await router.route({
      type: 2,
      channel_id: '424242',
      data: { name: 'ping' },
    });

    for (const key of [
      'DISCORD_BANG_CHIEN_CHANNEL_ID',
      'DISCORD_NGHICH_THUY_HAN_CHANNEL_ID',
      'DISCORD_KHAM_ACC_CHANNEL_ID',
    ]) {
      expect(get).toHaveBeenCalledWith(key, { infer: true });
    }
  });
});
