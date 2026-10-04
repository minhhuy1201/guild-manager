import { GuildRole } from '@guild/shared/enums';

import { FixedClock, TOKEN_TYPE } from '../../../common';
import { vn } from '../../../__tests__/vn-date';
import {
  ANNOUNCEMENT_ATTENDANCE_ID,
  ANNOUNCEMENT_LEAVE_ID,
} from '../custom-id';
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
  describe('xin nghỉ', () => {
    const MODAL_SUBMIT = {
      type: 5 as const,
      data: {
        custom_id: 'modal:nghi-phep',
        components: [
          { component: { custom_id: 'tu-ngay', value: '05/10' } },
          { component: { custom_id: 'den-ngay', value: '12/10' } },
          { component: { custom_id: 'ly-do', value: '' } },
        ],
      },
      member: { user: { id: '111' } },
    };

    /** A router whose leave service and clock are real enough for the modal path. */
    function leaveRouter(create: jest.Mock): InteractionRouter {
      return new InteractionRouter(
        {} as never,
        {} as never,
        {} as never,
        {
          resolve: jest.fn().mockResolvedValue({
            actor: {
              sub: '111',
              role: GuildRole.MEMBER,
              type: TOKEN_TYPE.access,
            },
            character: { id: 'meo-beo', name: 'Mèo Béo', discordId: '111' },
          }),
        } as never,
        { get: jest.fn().mockReturnValue('') } as never,
        {} as never,
        {} as never,
        {} as never,
        { create } as never,
        new FixedClock(vn('2026-10-04T12:00')),
      );
    }

    it('bấm nút Xin nghỉ mở modal, không gửi tin mới', async () => {
      const reply = await leaveRouter(jest.fn()).route({
        type: 3,
        data: { custom_id: ANNOUNCEMENT_LEAVE_ID },
        member: { user: { id: '111' } },
      });

      expect(reply).toMatchObject({
        type: INTERACTION_RESPONSE_TYPE.modal,
        data: { custom_id: 'modal:nghi-phep', title: 'Xin nghỉ' },
      });
    });

    it('submit modal đi đúng service với ô lý do rỗng là null', async () => {
      const create = jest
        .fn()
        .mockResolvedValue({ startDate: '2026-10-05', endDate: '2026-10-12' });

      const reply = await leaveRouter(create).route(MODAL_SUBMIT);

      expect(create).toHaveBeenCalledWith(
        {
          characterId: 'meo-beo',
          startDate: '2026-10-05',
          endDate: '2026-10-12',
          reason: null,
        },
        expect.objectContaining({ sub: '111' }),
      );
      expect(reply).toEqual({
        type: INTERACTION_RESPONSE_TYPE.channelMessageWithSource,
        data: {
          content: 'Đã khai nghỉ 05/10 - 12/10.',
          flags: MESSAGE_FLAG.ephemeral,
        },
      });
    });

    it('modal có custom_id lạ thì báo nút cũ, không lỗi 500', async () => {
      const create = jest.fn();

      const reply = await leaveRouter(create).route({
        ...MODAL_SUBMIT,
        data: { ...MODAL_SUBMIT.data, custom_id: 'modal:cu' },
      });

      expect(create).not.toHaveBeenCalled();
      expect(reply).toMatchObject({
        type: INTERACTION_RESPONSE_TYPE.channelMessageWithSource,
        data: { flags: MESSAGE_FLAG.ephemeral },
      });
    });
  });
});
