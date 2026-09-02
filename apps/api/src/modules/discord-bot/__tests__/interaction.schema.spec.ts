import {
  callerDiscordId,
  commandOptionValue,
  interactionSchema,
  type ApplicationCommandInteraction,
} from '../interaction.schema';

describe('interactionSchema', () => {
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
    // 3 = MESSAGE_COMPONENT (bấm nút). Chưa hỗ trợ, và im lặng nhận vào là tệ hơn từ chối.
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
    // Discord luôn gửi một trong hai. Không có nghĩa là ta hiểu sai payload, không phải lỗi người dùng.
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

    // /cau-hinh-kenh không có nó thì không biết lưu channel nào; Discord luôn gửi kèm cho lệnh
    // chạy trong server, nên thiếu là payload đọc sai chứ không phải người dùng làm được.
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
