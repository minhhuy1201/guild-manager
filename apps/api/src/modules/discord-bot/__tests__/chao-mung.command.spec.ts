import { GuildRole } from '@guild/shared/enums';

import { TOKEN_TYPE } from '../../../common';
import { chaoMungCommand } from '../commands/chao-mung.command';
import type { CommandDeps } from '../commands/command.types';
import {
  COMMAND_OPTION_TYPE,
  INTERACTION_RESPONSE_TYPE,
  MESSAGE_FLAG,
} from '../discord.constants';

const NEW_MEMBER_ID = '555666777';
const SECT_CHANNEL_ID = '444555666777888999';
const BANG_CHIEN_ID = '111222333444555666';
const NGHICH_THUY_HAN_ID = '222333444555666777';
const KHAM_ACC_ID = '333444555666777888';

const INTERACTION = {
  type: 2 as const,
  channel_id: '424242',
  data: {
    name: 'chao-mung',
    options: [
      { name: 'nguoi', value: NEW_MEMBER_ID },
      { name: 'luu-phai', value: SECT_CHANNEL_ID },
    ],
  },
  member: { user: { id: '111' } },
};

/**
 * Build deps around one resolved actor.
 * @param resolved - What ActorResolver.resolve returns
 * @returns Stubbed deps carrying the three configured channel ids
 */
function makeDeps(resolved: unknown): CommandDeps {
  return {
    actors: { resolve: jest.fn().mockResolvedValue(resolved) },
    links: {
      webOrigin: 'https://mmgh-nth.vercel.app',
      guildRoleId: '999888777',
      channelIds: {
        bangChien: BANG_CHIEN_ID,
        nghichThuyHan: NGHICH_THUY_HAN_ID,
        khamAcc: KHAM_ACC_ID,
      },
    },
  } as never;
}

/**
 * A resolved actor carrying the given role.
 * @param role - Guild role the caller signs in with
 * @returns The shape ActorResolver.resolve returns
 */
function actor(role: GuildRole): unknown {
  return {
    actor: { sub: '111', role, type: TOKEN_TYPE.access },
    characterId: 'meo-beo-k7ma3x',
  };
}

describe('/chao-mung', () => {
  it('admin đăng được lời chào công khai đủ bốn channel', async () => {
    const reply = await chaoMungCommand.execute(
      INTERACTION,
      makeDeps(actor(GuildRole.ADMIN)),
    );

    expect(reply.type).toBe(INTERACTION_RESPONSE_TYPE.channelMessageWithSource);
    expect(reply.data.flags).toBeUndefined();
    expect(reply.data.content).toBe(
      `Chào mừng <@${NEW_MEMBER_ID}> gia nhập bang!\n` +
        '- Chat bang ở đây nha\n' +
        `- Các thông báo thì ở <#${BANG_CHIEN_ID}> , <#${NGHICH_THUY_HAN_ID}>\n` +
        `- Chat lưu phái <#${SECT_CHANNEL_ID}>\n` +
        `- Bây giờ ông vào <#${KHAM_ACC_ID}> để up gear nhé`,
    );
  });

  it('chỉ cho phép ping đúng người mới', async () => {
    // Lời chào là tin công khai; khai báo trắng danh sách khiến một @everyone lọt vào là bất khả.
    const reply = await chaoMungCommand.execute(
      INTERACTION,
      makeDeps(actor(GuildRole.ADMIN)),
    );

    expect(reply.data.allowed_mentions).toEqual({ users: [NEW_MEMBER_ID] });
  });

  it('bang chúng bị từ chối riêng tư, không đăng gì vào kênh', async () => {
    const reply = await chaoMungCommand.execute(
      INTERACTION,
      makeDeps(actor(GuildRole.MEMBER)),
    );

    expect(reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
    expect(reply.data.content).toBe('Chỉ admin mới chào thành viên mới được.');
  });

  it('người gọi chưa được gán nhân vật thì nhận NOT_LINKED', async () => {
    const reply = await chaoMungCommand.execute(INTERACTION, makeDeps(null));

    expect(reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
    expect(reply.data.content).toContain('chưa được gán nhân vật');
  });

  it('thiếu option thì báo lỗi nêu đúng tên option', async () => {
    // Discord ép required:true, nên giá trị rỗng nghĩa là definition đã đăng ký và bản build này
    // lệch nhau — thông điệp phải chỉ ra option nào để biết chạy lại discord:register.
    for (const missing of ['nguoi', 'luu-phai']) {
      const interaction = {
        ...INTERACTION,
        data: {
          ...INTERACTION.data,
          options: INTERACTION.data.options.filter(
            (option) => option.name !== missing,
          ),
        },
      };

      await expect(
        chaoMungCommand.execute(interaction, makeDeps(actor(GuildRole.ADMIN))),
      ).rejects.toThrow(missing);
    }
  });

  it('khai báo hai option bắt buộc, đúng kiểu Discord', () => {
    const options = chaoMungCommand.definition.options ?? [];

    expect(
      options.map(({ name, type, required }) => ({ name, type, required })),
    ).toEqual([
      {
        name: 'nguoi',
        type: COMMAND_OPTION_TYPE.user,
        required: true,
      },
      {
        name: 'luu-phai',
        type: COMMAND_OPTION_TYPE.channel,
        required: true,
      },
    ]);

    for (const option of options) {
      expect(option.description.length).toBeGreaterThan(0);
    }
  });
});
