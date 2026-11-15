import { GuildRole } from '@guild/shared/enums';

import { TOKEN_TYPE } from '../../../common';
import { cauHinhKenhCommand } from '../commands/cau-hinh-kenh.command';
import type { CommandDeps } from '../commands/command.types';
import { MESSAGE_FLAG } from '../discord.constants';
import { DiscordApiError } from '../discord-rest';

const BARE_INTERACTION = {
  type: 2 as const,
  channel_id: '424242',
  application_id: '777',
  token: 'interaction-token',
  data: { name: 'cau-hinh-kenh' },
  member: { user: { id: '111' } },
};

/**
 * The invocation with the `muc-dich` option set.
 * @param value - Raw option value
 * @returns The interaction
 */
function withPurpose(value: string) {
  return {
    ...BARE_INTERACTION,
    data: {
      name: 'cau-hinh-kenh',
      options: [{ name: 'muc-dich', type: 3, value }],
    },
  };
}

const INTERACTION = withPurpose('ADMIN_ALERT');

/**
 * A resolved actor carrying the given role.
 * @param role - Guild role the caller signs in with
 * @returns The shape ActorResolver.resolve returns
 */
function actor(role: GuildRole): unknown {
  return {
    actor: { sub: '111', role, type: TOKEN_TYPE.access },
    character: { id: 'meo-beo-k7ma3x', name: 'Mèo Béo', discordId: '111' },
  };
}

/**
 * Build deps around one resolved actor and one REST outcome.
 * @param resolved - What ActorResolver.resolve returns
 * @param postMessage - Stub standing in for the confirmation post
 * @returns Stubbed deps plus the `set` mock, for assertions
 */
function makeDeps(resolved: unknown, postMessage: jest.Mock) {
  const set = jest.fn().mockResolvedValue(undefined);

  const deps = {
    actors: { resolve: jest.fn().mockResolvedValue(resolved) },
    rest: { postMessage },
    channels: { set },
  } as never as CommandDeps;

  return { deps, set };
}

describe('/cau-hinh-kenh', () => {
  it('lưu đúng channel đang gõ lệnh', async () => {
    const postMessage = jest.fn().mockResolvedValue(undefined);
    const { deps, set } = makeDeps(actor(GuildRole.ADMIN), postMessage);

    const reply = await cauHinhKenhCommand.execute(INTERACTION, deps);

    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith('424242', expect.anything());
    expect(set).toHaveBeenCalledWith('ADMIN_ALERT', '424242');
    expect(reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
  });

  // The old default pointed at the reminder channel, which no longer exists.
  it('muc-dich là option bắt buộc, chỉ còn hai lựa chọn', () => {
    const [option] = cauHinhKenhCommand.definition.options ?? [];

    expect(option.required).toBe(true);
    expect(option.choices?.map((choice) => choice.value)).toEqual([
      'ADMIN_ALERT',
      'GENERAL_NOTI',
    ]);
  });

  it('thiếu muc-dich: ném lỗi nhắc discord:register, không lưu gì', async () => {
    const postMessage = jest.fn();
    const { deps, set } = makeDeps(actor(GuildRole.ADMIN), postMessage);

    await expect(
      cauHinhKenhCommand.execute(BARE_INTERACTION, deps),
    ).rejects.toThrow('discord:register');
    expect(set).not.toHaveBeenCalled();
    expect(postMessage).not.toHaveBeenCalled();
  });

  // A permission mistake has to surface while configuring, not at 09:00 the next morning in a log
  // nobody reads.
  it('không lưu gì khi Discord từ chối vì thiếu quyền, và nói rõ phải sửa gì', async () => {
    const postMessage = jest
      .fn()
      .mockRejectedValue(new DiscordApiError(403, '424242', 'Missing Access'));
    const { deps, set } = makeDeps(actor(GuildRole.ADMIN), postMessage);

    const reply = await cauHinhKenhCommand.execute(INTERACTION, deps);

    expect(set).not.toHaveBeenCalled();
    expect(reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
    expect(reply.data.content).toContain('quyền');
  });

  // A system error used to masquerade as a permission error, sending the admin off to fix something
  // that was not broken.
  it('lỗi khác của Discord cũng không lưu, nhưng không đổ cho phân quyền', async () => {
    const postMessage = jest
      .fn()
      .mockRejectedValue(new DiscordApiError(500, '424242', 'Server Error'));
    const { deps, set } = makeDeps(actor(GuildRole.ADMIN), postMessage);

    const reply = await cauHinhKenhCommand.execute(INTERACTION, deps);

    expect(set).not.toHaveBeenCalled();
    expect(reply.data.content).not.toContain('quyền');
    expect(reply.data.content).toContain('chưa lưu');
  });

  it('thành viên thường bị từ chối, và chỉ mình họ thấy', async () => {
    const postMessage = jest.fn();
    const { deps, set } = makeDeps(actor(GuildRole.MEMBER), postMessage);

    const reply = await cauHinhKenhCommand.execute(INTERACTION, deps);

    expect(set).not.toHaveBeenCalled();
    expect(postMessage).not.toHaveBeenCalled();
    expect(reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
  });

  it('Discord ID không gán với ai thì bị từ chối', async () => {
    const postMessage = jest.fn();
    const { deps, set } = makeDeps(null, postMessage);

    await cauHinhKenhCommand.execute(INTERACTION, deps);

    expect(set).not.toHaveBeenCalled();
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('muc-dich = ADMIN_ALERT: đặt kênh admin, nói rõ kênh nhận cả lỗi lẫn người không nhận được tin nhắc', async () => {
    const postMessage = jest.fn().mockResolvedValue(undefined);
    const { deps, set } = makeDeps(actor(GuildRole.ADMIN), postMessage);

    const reply = await cauHinhKenhCommand.execute(
      withPurpose('ADMIN_ALERT'),
      deps,
    );

    expect(set).toHaveBeenCalledWith('ADMIN_ALERT', '424242');
    const [, message] = postMessage.mock.calls[0] as [
      string,
      { content: string },
    ];
    expect(message.content).toContain('báo lỗi cho admin');
    expect(reply.data.content).toBe(
      'Đã lưu. Từ giờ bot sẽ báo lỗi và danh sách người không nhận được tin nhắc điểm danh trong channel này.',
    );
  });

  it('muc-dich = GENERAL_NOTI: đặt kênh thông báo chung, tin xác nhận đúng câu', async () => {
    const postMessage = jest.fn().mockResolvedValue(undefined);
    const { deps, set } = makeDeps(actor(GuildRole.ADMIN), postMessage);

    await cauHinhKenhCommand.execute(withPurpose('GENERAL_NOTI'), deps);

    expect(set).toHaveBeenCalledWith('GENERAL_NOTI', '424242');
    expect(postMessage).toHaveBeenCalledWith('424242', {
      content: '✅ Channel này đã được đặt làm nơi bot gửi thông báo chung.',
    });
  });

  it('giá trị lạ: ném lỗi nhắc discord:register', async () => {
    const postMessage = jest.fn();
    const { deps, set } = makeDeps(actor(GuildRole.ADMIN), postMessage);

    await expect(
      cauHinhKenhCommand.execute(withPurpose('NOPE'), deps),
    ).rejects.toThrow('discord:register');
    expect(set).not.toHaveBeenCalled();
    expect(postMessage).not.toHaveBeenCalled();
  });

  it.each(['ADMIN_ALERT', 'GENERAL_NOTI'])(
    'tin xác nhận bị từ chối: không lưu (%s)',
    async (purpose) => {
      const postMessage = jest
        .fn()
        .mockRejectedValue(
          new DiscordApiError(403, '424242', 'Missing Access'),
        );
      const { deps, set } = makeDeps(actor(GuildRole.ADMIN), postMessage);

      await cauHinhKenhCommand.execute(withPurpose(purpose), deps);

      expect(set).not.toHaveBeenCalled();
    },
  );
});
