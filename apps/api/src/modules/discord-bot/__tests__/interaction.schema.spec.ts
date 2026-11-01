import {
  callerDiscordId,
  commandOptionValue,
  interactionSchema,
  invokedSubcommand,
  isEphemeralPress,
  type ApplicationCommandInteraction,
  type MessageComponentInteraction,
} from '../interaction.schema';
import { MESSAGE_FLAG } from '../discord.constants';

/**
 * Parse a button press carrying the given message flags.
 * @param flags - The `flags` field Discord sends on the message, omitted when undefined
 * @returns The validated press
 */
function pressWithFlags(flags?: number): MessageComponentInteraction {
  return interactionSchema.parse({
    type: 3,
    data: { custom_id: 'dd:gw-2026-08-31:meo-beo-k7ma3x:1' },
    member: { user: { id: '111' } },
    ...(flags === undefined ? {} : { message: { flags } }),
  }) as MessageComponentInteraction;
}

describe('interactionSchema', () => {
  it('nhận lựa chọn của string select, giá trị nằm trong data.values', () => {
    const parsed = interactionSchema.parse({
      type: 3,
      data: { custom_id: 'cs:chon:s1', component_type: 3, values: ['KEEP'] },
      member: { user: { id: '111' } },
    }) as MessageComponentInteraction;

    expect(parsed.data.values).toEqual(['KEEP']);
  });

  it('nhận gói modal submit, chỉ giữ custom_id và value của từng ô', () => {
    const parsed = interactionSchema.parse({
      type: 5,
      data: {
        custom_id: 'modal:nghi-phep',
        components: [
          {
            type: 18,
            id: 1,
            component: { type: 4, id: 2, custom_id: 'tu-ngay', value: '05/10' },
          },
        ],
      },
      member: { user: { id: '111' } },
    });

    expect(parsed).toEqual({
      type: 5,
      data: {
        custom_id: 'modal:nghi-phep',
        components: [{ component: { custom_id: 'tu-ngay', value: '05/10' } }],
      },
      member: { user: { id: '111' } },
    });
  });

  it('đọc được gói PING Discord dùng để kiểm tra endpoint', () => {
    const parsed = interactionSchema.parse({ type: 1 });

    expect(parsed).toEqual({ type: 1 });
  });

  it('đọc được một lệnh và giữ lại tên lệnh', () => {
    const parsed = interactionSchema.parse({
      type: 2,
      channel_id: '424242',
      data: { name: 'ping', id: '123' },
    });

    expect(parsed).toEqual({
      type: 2,
      channel_id: '424242',
      data: { name: 'ping' },
    });
  });

  it('từ chối type không nằm trong hai loại đang xử lý', () => {
    // 3 = MESSAGE_COMPONENT (a button press). Not supported yet, and accepting it in silence is
    // worse than refusing.
    expect(() => interactionSchema.parse({ type: 3 })).toThrow();
  });

  it('từ chối một lệnh không có tên', () => {
    expect(() => interactionSchema.parse({ type: 2, data: {} })).toThrow();
  });
});

describe('MESSAGE_COMPONENT', () => {
  it('nhận một lượt bấm nút', () => {
    const parsed = interactionSchema.parse({
      type: 3,
      data: { custom_id: 'dd:gw-2026-08-31:meo-beo-k7ma3x:1' },
      member: { user: { id: '111' } },
    });

    expect(parsed.type).toBe(3);
  });
});

describe('isEphemeralPress', () => {
  it('tin nhắn ephemeral thì đúng', () => {
    expect(isEphemeralPress(pressWithFlags(MESSAGE_FLAG.ephemeral))).toBe(true);
  });

  it('đọc theo bit, không so bằng — Discord còn bật cờ khác cùng lúc', () => {
    // 4096 = SUPPRESS_NOTIFICATIONS; an equality check would read an ephemeral message as public.
    expect(
      isEphemeralPress(pressWithFlags(MESSAGE_FLAG.ephemeral | 4096)),
    ).toBe(true);
  });

  it('không có flags thì coi là tin công khai', () => {
    expect(isEphemeralPress(pressWithFlags())).toBe(false);
  });
});

describe('callerDiscordId', () => {
  it('đọc id từ member khi lệnh chạy trong server', () => {
    const parsed = interactionSchema.parse({
      type: 2,
      channel_id: '424242',
      data: { name: 'diem-danh' },
      member: { user: { id: '111' } },
    });

    expect(callerDiscordId(parsed as ApplicationCommandInteraction)).toBe(
      '111',
    );
  });

  it('đọc id từ user khi lệnh chạy trong DM', () => {
    const parsed = interactionSchema.parse({
      type: 2,
      channel_id: '424242',
      data: { name: 'diem-danh' },
      user: { id: '222' },
    });

    expect(callerDiscordId(parsed as ApplicationCommandInteraction)).toBe(
      '222',
    );
  });

  it('ném lỗi khi interaction không mang người gọi nào', () => {
    // Discord always sends one of the two. Neither one present means we misread the payload, not
    // that the user did anything wrong.
    const parsed = interactionSchema.parse({
      type: 2,
      channel_id: '424242',
      data: { name: 'diem-danh' },
    });

    expect(() =>
      callerDiscordId(parsed as ApplicationCommandInteraction),
    ).toThrow();
  });
});

describe('invokedSubcommand', () => {
  it('đọc tên subcommand và giá trị option lồng bên trong', () => {
    const parsed = interactionSchema.parse({
      type: 2,
      channel_id: '424242',
      data: {
        name: 'khao-sat-luu-phai',
        options: [
          {
            name: 'mo',
            type: 1,
            options: [
              { name: 'ten', type: 3, value: 'Update 06/11' },
              { name: 'han', type: 3, value: '06/11' },
            ],
          },
        ],
      },
      member: { user: { id: '111' } },
    });

    const subcommand = invokedSubcommand(
      parsed as ApplicationCommandInteraction,
    );

    expect(subcommand?.name).toBe('mo');
    expect(subcommand?.option('ten')).toBe('Update 06/11');
    expect(subcommand?.option('khac')).toBeNull();
  });

  it.each([
    ['value rỗng', { name: 'loai', type: 3, value: '' }],
    ['value không phải chuỗi', { name: 'so', type: 4, value: 5 }],
    ['không có type và value hỏng', { name: 'loai', value: '' }],
    ['không có type và value kiểu số', { name: 'so', value: 5 }],
  ])('từ chối option hỏng: %s', (_name, option) => {
    expect(() =>
      interactionSchema.parse({
        type: 2,
        channel_id: '424242',
        data: { name: 'diem-danh-ho', options: [option] },
        member: { user: { id: '111' } },
      }),
    ).toThrow();
  });

  it('nhận một subcommand đúng tag và giữ option lồng bên trong', () => {
    const parsed = interactionSchema.parse({
      type: 2,
      channel_id: '424242',
      data: {
        name: 'khao-sat-luu-phai',
        options: [{ name: 'nhac', type: 1, options: [] }],
      },
      member: { user: { id: '111' } },
    });

    expect(
      invokedSubcommand(parsed as ApplicationCommandInteraction)?.name,
    ).toBe('nhac');
  });

  it('trả null khi lệnh gửi lên không có subcommand', () => {
    const parsed = interactionSchema.parse({
      type: 2,
      channel_id: '424242',
      data: {
        name: 'diem-danh-ho',
        options: [{ name: 'nguoi', type: 6, value: '999' }],
      },
      member: { user: { id: '111' } },
    });

    expect(
      invokedSubcommand(parsed as ApplicationCommandInteraction),
    ).toBeNull();
  });
});

describe('commandOptionValue', () => {
  it('đọc giá trị của option theo tên', () => {
    const parsed = interactionSchema.parse({
      type: 2,
      channel_id: '424242',
      data: {
        name: 'diem-danh-ho',
        options: [{ name: 'nguoi', type: 6, value: '999' }],
      },
      member: { user: { id: '111' } },
    });

    expect(
      commandOptionValue(parsed as ApplicationCommandInteraction, 'nguoi'),
    ).toBe('999');
  });

  it('trả null khi option không có mặt', () => {
    const parsed = interactionSchema.parse({
      type: 2,
      channel_id: '424242',
      data: { name: 'diem-danh' },
      member: { user: { id: '111' } },
    });

    expect(
      commandOptionValue(parsed as ApplicationCommandInteraction, 'nguoi'),
    ).toBeNull();
  });

  describe('channel_id', () => {
    it('đọc ra channel nơi lệnh được gõ', () => {
      const parsed = interactionSchema.parse({
        type: 2,
        channel_id: '424242',
        data: { name: 'cau-hinh-kenh' },
        member: { user: { id: '111' } },
      });

      expect(parsed).toMatchObject({ channel_id: '424242' });
    });

    // Without it /cau-hinh-kenh does not know which channel to store; Discord always includes it
    // for a command run inside a server, so a missing one means the payload was misread, not
    // something a user can cause.
    it('từ chối một lệnh không mang channel_id', () => {
      expect(() =>
        interactionSchema.parse({
          type: 2,
          data: { name: 'cau-hinh-kenh' },
          member: { user: { id: '111' } },
        }),
      ).toThrow();
    });
  });
});
