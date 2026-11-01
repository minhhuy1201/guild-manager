import { BadRequestException } from '@nestjs/common';
import {
  ClassChangeConfidence,
  GuildClass,
  GuildRole,
} from '@guild/shared/enums';

import { FixedClock, TOKEN_TYPE } from '../../../common';
import { vn } from '../../../__tests__/vn-date';
import {
  ANNOUNCEMENT_ATTENDANCE_ID,
  ANNOUNCEMENT_AUTO_ATTEND_ID,
  ANNOUNCEMENT_LEAVE_ID,
  AUTO_ATTEND_OFF_ID,
  AUTO_ATTEND_ON_ID,
  encodeSurveyFillId,
  encodeSurveyLevelId,
  encodeSurveySelectId,
} from '../custom-id';
import { INTERACTION_RESPONSE_TYPE, MESSAGE_FLAG } from '../discord.constants';
import { InteractionRouter } from '../interaction-router';

/** Every button test below lands on this one sentence, so it is written once. */
const NOT_LINKED =
  'Bạn chưa được gán nhân vật nào. Nhờ ADMIN thêm Discord ID của bạn.';

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
        {} as never,
        {} as never,
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
  describe('tự động điểm danh', () => {
    const LINKED = {
      actor: { sub: '111', role: GuildRole.MEMBER, type: TOKEN_TYPE.access },
      character: { id: 'meo-beo', name: 'Mèo Béo', discordId: '111' },
    };
    const ENABLED_AT = vn('2026-10-20T08:00').toISOString();
    const OFF = { enabled: false, enabledAt: null };
    const ON = { enabled: true, enabledAt: ENABLED_AT };
    const press = (customId: string) => ({
      type: 3 as const,
      data: { custom_id: customId },
      member: { user: { id: '111' } },
    });

    /** A router whose Auto-attend service is a pair of stubs. */
    function autoRouter(
      autoAttend: { status?: jest.Mock; set?: jest.Mock },
      resolve: unknown = LINKED,
    ): InteractionRouter {
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
        autoAttend as never,
        {} as never,
        new FixedClock(vn('2026-10-27T12:00')),
      );
    }

    it('bấm nút khi đang tắt mở tin riêng có cảnh báo và nút Bật', async () => {
      const reply = await autoRouter({
        status: jest.fn().mockResolvedValue(OFF),
      }).route(press(ANNOUNCEMENT_AUTO_ATTEND_ID));

      expect(reply).toMatchObject({
        type: INTERACTION_RESPONSE_TYPE.channelMessageWithSource,
        data: {
          flags: MESSAGE_FLAG.ephemeral,
          components: [
            {
              components: [{ label: 'Bật', custom_id: AUTO_ATTEND_ON_ID }],
            },
          ],
        },
      });
      const content = (reply as { data: { content: string } }).data.content;
      expect(content).toContain('tự động điểm danh **CÓ**');
      expect(content).toContain('**KHÔNG**');
    });

    it('bấm nút khi đang bật nói bật từ ngày nào và có nút Tắt', async () => {
      const reply = await autoRouter({
        status: jest.fn().mockResolvedValue(ON),
      }).route(press(ANNOUNCEMENT_AUTO_ATTEND_ID));

      expect(reply).toMatchObject({
        type: INTERACTION_RESPONSE_TYPE.channelMessageWithSource,
        data: {
          content: 'Bạn đang bật tự động điểm danh từ 20/10.',
          flags: MESSAGE_FLAG.ephemeral,
          components: [
            {
              components: [{ label: 'Tắt', custom_id: AUTO_ATTEND_OFF_ID }],
            },
          ],
        },
      });
    });

    it('bấm Bật bật cho nhân vật của người bấm rồi viết lại tin tại chỗ', async () => {
      const set = jest.fn().mockResolvedValue(ON);

      const reply = await autoRouter({ set }).route(press(AUTO_ATTEND_ON_ID));

      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({ sub: '111' }),
        true,
      );
      expect(reply).toMatchObject({
        type: INTERACTION_RESPONSE_TYPE.updateMessage,
        data: {
          content: 'Bạn đang bật tự động điểm danh từ 20/10.',
          components: [{ components: [{ custom_id: AUTO_ATTEND_OFF_ID }] }],
        },
      });
    });

    it('bấm Tắt tắt rồi viết lại tin với nút Bật', async () => {
      const set = jest.fn().mockResolvedValue(OFF);

      const reply = await autoRouter({ set }).route(press(AUTO_ATTEND_OFF_ID));

      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({ sub: '111' }),
        false,
      );
      expect(reply).toMatchObject({
        type: INTERACTION_RESPONSE_TYPE.updateMessage,
        data: {
          components: [{ components: [{ custom_id: AUTO_ATTEND_ON_ID }] }],
        },
      });
    });

    it('bấm lại nút Bật cũ khi đã bật thì tin hiện trạng thái thật', async () => {
      // The service answers an already-on switch with the running period, so a stale press reads
      // as "on since 20/10" rather than as an error.
      const reply = await autoRouter({
        set: jest.fn().mockResolvedValue(ON),
      }).route(press(AUTO_ATTEND_ON_ID));

      expect(reply).toMatchObject({
        type: INTERACTION_RESPONSE_TYPE.updateMessage,
        data: { content: 'Bạn đang bật tự động điểm danh từ 20/10.' },
      });
    });

    it.each([
      ['nút mở bảng', ANNOUNCEMENT_AUTO_ATTEND_ID],
      ['nút Bật', AUTO_ATTEND_ON_ID],
      ['nút Tắt', AUTO_ATTEND_OFF_ID],
    ])(
      'người chưa được gán nhân vật bấm %s thì nhận tin riêng, không ghi đè bảng',
      async (_name, customId) => {
        const status = jest.fn();
        const set = jest.fn();

        const reply = await autoRouter({ status, set }, null).route(
          press(customId),
        );

        expect(reply).toEqual({
          type: INTERACTION_RESPONSE_TYPE.channelMessageWithSource,
          data: { content: NOT_LINKED, flags: MESSAGE_FLAG.ephemeral },
        });
        expect(status).not.toHaveBeenCalled();
        expect(set).not.toHaveBeenCalled();
      },
    );

    it('admin cứu hộ không có nhân vật nhận cùng lời từ chối như /diem-danh', async () => {
      const reply = await autoRouter(
        { status: jest.fn() },
        { actor: LINKED.actor, character: null },
      ).route(press(ANNOUNCEMENT_AUTO_ATTEND_ID));

      expect(reply).toMatchObject({
        type: INTERACTION_RESPONSE_TYPE.channelMessageWithSource,
        data: { flags: MESSAGE_FLAG.ephemeral },
      });
    });

    it('custom_id lạ trên tin cũ nhận lời báo nút cũ, không lỗi', async () => {
      const reply = await autoRouter({}).route(press('auto:khong-ro'));

      expect(reply).toMatchObject({
        type: INTERACTION_RESPONSE_TYPE.channelMessageWithSource,
        data: { flags: MESSAGE_FLAG.ephemeral },
      });
    });
  });
});

describe('InteractionRouter - khảo sát lưu phái', () => {
  const SURVEY_ID = 'cl9x0survey';
  const LINKED = {
    actor: { sub: '111', role: GuildRole.MEMBER, type: TOKEN_TYPE.access },
    character: { id: 'meo-beo', name: 'Mèo Béo', discordId: '111' },
  };
  const SURVEY = {
    id: SURVEY_ID,
    title: 'Update 06/11',
    closesAt: vn('2026-11-05T23:59').toISOString(),
    isOpen: true,
  };
  const memberRow = (answer: unknown = null) => ({
    id: 'meo-beo',
    name: 'Mèo Béo',
    guildClass: GuildClass.TO_VAN,
    answer,
  });
  const press = (customId: string, values?: string[]) => ({
    type: 3 as const,
    data: { custom_id: customId, ...(values ? { values } : {}) },
    member: { user: { id: '111' } },
  });

  type Reply = {
    type: number;
    data: {
      content: string;
      flags?: number;
      components?: {
        components: {
          custom_id: string;
          label?: string;
          options?: unknown[];
        }[];
      }[];
    };
  };

  function surveyRouter(opts: {
    view?: unknown;
    answer?: jest.Mock;
    resolve?: unknown;
  }): InteractionRouter {
    const view = opts.view ?? { survey: SURVEY, members: [memberRow()] };

    return new InteractionRouter(
      {} as never,
      {} as never,
      {} as never,
      {
        resolve: jest
          .fn()
          .mockResolvedValue(
            opts.resolve === undefined ? LINKED : opts.resolve,
          ),
      } as never,
      { get: jest.fn().mockReturnValue('') } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {
        panelFor: jest.fn().mockImplementation((surveyId: string) => {
          const { survey, members } = view as {
            survey: typeof SURVEY | null;
            members: ReturnType<typeof memberRow>[];
          };
          const member = members[0];

          return Promise.resolve(
            survey?.id === surveyId && member
              ? {
                  survey,
                  fromClass: member.guildClass,
                  answer: member.answer,
                }
              : null,
          );
        }),
        answer: opts.answer ?? jest.fn(),
      } as never,
      new FixedClock(vn('2026-11-01T12:00')),
    );
  }

  it('nút Điền khảo sát mở tin riêng có phái hiện tại, chưa điền và menu chọn', async () => {
    const reply = (await surveyRouter({}).route(
      press(encodeSurveyFillId(SURVEY_ID)),
    )) as Reply;

    expect(reply.type).toBe(INTERACTION_RESPONSE_TYPE.channelMessageWithSource);
    expect(reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
    expect(reply.data.content).toContain('Tố Vấn');
    expect(reply.data.content).toContain('chưa điền');

    const select = reply.data.components![0].components[0];

    expect(select.custom_id).toBe(encodeSurveySelectId(SURVEY_ID));
    expect(select.options).toHaveLength(Object.values(GuildClass).length);
    expect(select.options).not.toContainEqual(
      expect.objectContaining({ value: GuildClass.TO_VAN }),
    );
  });

  it('mở lại bảng thì hiện câu đã lưu', async () => {
    const saved = {
      kind: 'CHANGE',
      fromClass: GuildClass.TO_VAN,
      targetClass: GuildClass.HUYET_HA,
      confidence: 'SURE',
    };
    const reply = (await surveyRouter({
      view: { survey: SURVEY, members: [memberRow(saved)] },
    }).route(press(encodeSurveyFillId(SURVEY_ID)))) as Reply;

    expect(reply.data.content).toContain('Chuyển sang Huyết Hà');
    expect(reply.data.content).toContain('Chắc chắn');
  });

  it('chọn Giữ nguyên lưu ngay và viết lại bảng với dòng xác nhận', async () => {
    const answer = jest
      .fn()
      .mockResolvedValue({ kind: 'KEEP', fromClass: GuildClass.TO_VAN });
    const reply = (await surveyRouter({ answer }).route(
      press(encodeSurveySelectId(SURVEY_ID), ['KEEP']),
    )) as Reply;

    expect(answer).toHaveBeenCalledWith(SURVEY_ID, LINKED.actor, {
      kind: 'KEEP',
    });
    expect(reply.type).toBe(INTERACTION_RESPONSE_TYPE.updateMessage);
    expect(reply.data.content).toContain('Đã lưu');
    expect(reply.data.content).toContain('Giữ nguyên');
  });

  it('chọn một phái chưa lưu, chỉ viết lại bảng với hai nút mức độ', async () => {
    const answer = jest.fn();
    const reply = (await surveyRouter({ answer }).route(
      press(encodeSurveySelectId(SURVEY_ID), [GuildClass.HUYET_HA]),
    )) as Reply;

    expect(answer).not.toHaveBeenCalled();
    expect(reply.type).toBe(INTERACTION_RESPONSE_TYPE.updateMessage);
    expect(reply.data.content).toContain('Huyết Hà');

    const buttons = reply.data.components![1].components;

    expect(buttons.map((button) => button.label)).toEqual([
      'Chắc chắn',
      'Đang cân nhắc',
    ]);
    expect(buttons[0].custom_id).toBe(
      encodeSurveyLevelId({
        surveyId: SURVEY_ID,
        targetClass: GuildClass.HUYET_HA,
        confidence: ClassChangeConfidence.SURE,
      }),
    );
  });

  it('bấm nút mức độ lưu đúng phái và mức độ rồi hiện xác nhận', async () => {
    const answer = jest.fn().mockResolvedValue({
      kind: 'CHANGE',
      fromClass: GuildClass.TO_VAN,
      targetClass: GuildClass.HUYET_HA,
      confidence: 'CONSIDERING',
    });
    const reply = (await surveyRouter({ answer }).route(
      press(
        encodeSurveyLevelId({
          surveyId: SURVEY_ID,
          targetClass: GuildClass.HUYET_HA,
          confidence: ClassChangeConfidence.CONSIDERING,
        }),
      ),
    )) as Reply;

    expect(answer).toHaveBeenCalledWith(SURVEY_ID, LINKED.actor, {
      kind: 'CHANGE',
      targetClass: GuildClass.HUYET_HA,
      confidence: ClassChangeConfidence.CONSIDERING,
    });
    expect(reply.type).toBe(INTERACTION_RESPONSE_TYPE.updateMessage);
    expect(reply.data.content).toContain('Đã lưu');
    expect(reply.data.content).toContain('Đang cân nhắc');
    // The confidence buttons are gone once the answer is saved.
    expect(reply.data.components).toHaveLength(1);
  });

  it('lời từ chối của service (trùng phái, hết hạn) ra tin riêng, không ghi đè bảng', async () => {
    const answer = jest
      .fn()
      .mockRejectedValue(
        new BadRequestException('Phái muốn chuyển phải khác phái hiện tại.'),
      );
    const reply = (await surveyRouter({ answer }).route(
      press(
        encodeSurveyLevelId({
          surveyId: SURVEY_ID,
          targetClass: GuildClass.TO_VAN,
          confidence: ClassChangeConfidence.SURE,
        }),
      ),
    )) as Reply;

    expect(reply).toEqual({
      type: INTERACTION_RESPONSE_TYPE.channelMessageWithSource,
      data: {
        content: 'Phái muốn chuyển phải khác phái hiện tại.',
        flags: MESSAGE_FLAG.ephemeral,
      },
    });
  });

  it.each([
    [
      'đợt đã đóng',
      { survey: { ...SURVEY, isOpen: false }, members: [memberRow()] },
    ],
    [
      'đợt khác đang mở',
      { survey: { ...SURVEY, id: 'other' }, members: [memberRow()] },
    ],
    ['chưa có đợt nào', { survey: null, members: [memberRow()] }],
  ])('nút của %s nhận tin riêng nói đợt đã đóng', async (_name, view) => {
    const answer = jest.fn();
    const reply = (await surveyRouter({ view, answer }).route(
      press(encodeSurveyFillId(SURVEY_ID)),
    )) as Reply;

    expect(reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
    expect(reply.data.content).toContain('đã đóng');
    expect(answer).not.toHaveBeenCalled();
  });

  it('chọn trên bảng của đợt đã đóng không lưu gì', async () => {
    const answer = jest.fn();
    const reply = (await surveyRouter({
      view: { survey: { ...SURVEY, isOpen: false }, members: [memberRow()] },
      answer,
    }).route(press(encodeSurveySelectId(SURVEY_ID), ['KEEP']))) as Reply;

    expect(answer).not.toHaveBeenCalled();
    expect(reply.data.content).toContain('đã đóng');
  });

  it('tài khoản chưa liên kết nhận tin riêng nói chưa liên kết', async () => {
    const reply = (await surveyRouter({ resolve: null }).route(
      press(encodeSurveyFillId(SURVEY_ID)),
    )) as Reply;

    expect(reply).toEqual({
      type: INTERACTION_RESPONSE_TYPE.channelMessageWithSource,
      data: { content: NOT_LINKED, flags: MESSAGE_FLAG.ephemeral },
    });
  });

  it('giá trị menu lạ nhận tin riêng báo bảng cũ, không lưu', async () => {
    const answer = jest.fn();
    const reply = (await surveyRouter({ answer }).route(
      press(encodeSurveySelectId(SURVEY_ID), ['PHAI_LA']),
    )) as Reply;

    expect(answer).not.toHaveBeenCalled();
    expect(reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
    expect(reply.data.content).toContain('không còn dùng được');
  });

  it('custom_id khảo sát lạ không làm hỏng, nhận tin riêng', async () => {
    const reply = (await surveyRouter({}).route(
      press('cs:muc:chi-co-hai'),
    )) as Reply;

    expect(reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
  });
});
