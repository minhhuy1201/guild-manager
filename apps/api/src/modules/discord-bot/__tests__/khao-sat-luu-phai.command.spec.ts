import { GrantableCommand, GuildRole } from '@guild/shared/enums';
import { SURVEY_TITLE_MAX_LENGTH } from '@guild/shared/schemas';

import { TOKEN_TYPE } from '../../../common';
import { vn } from '../../../__tests__/vn-date';
import { khaoSatLuuPhaiCommand } from '../commands/khao-sat-luu-phai.command';
import type { ButtonComponent, CommandDeps } from '../commands/command.types';
import { decodeSurveyFillId } from '../custom-id';
import {
  COMPONENT_TYPE,
  INTERACTION_RESPONSE_TYPE,
  MAX_CONTENT_LENGTH,
  MESSAGE_FLAG,
} from '../discord.constants';
import { NOT_GRANTED } from '../require-command';

const NOW = vn('2026-11-01T09:00');
const SURVEY_ID = 'cl9x0survey';

/**
 * A `/khao-sat-luu-phai mo` invocation.
 * @param han - What was typed in `han`
 * @returns The validated interaction
 */
function invocation(han: string) {
  return {
    type: 2 as const,
    channel_id: '424242',
    data: {
      name: 'khao-sat-luu-phai',
      options: [
        {
          name: 'mo',
          type: 1 as const,
          options: [
            { name: 'ten', value: 'Update 06/11' },
            { name: 'han', value: han },
          ],
        },
      ],
    },
    member: { user: { id: '111' } },
  };
}

/**
 * Deps around one caller and a survey service stub.
 * @param role - Role of the caller
 * @param open - Stub for `classSurveys.open`
 * @param grantedCommands - Grants a Manager carries
 * @param unanswered - Stub for `classSurveys.unanswered`
 * @returns The deps
 */
function makeDeps(
  role: GuildRole,
  open: jest.Mock,
  grantedCommands: GrantableCommand[] = [],
  unanswered: jest.Mock = jest.fn(),
): CommandDeps {
  return {
    actors: {
      resolve: jest.fn().mockResolvedValue({
        actor: { sub: '111', role, type: TOKEN_TYPE.access, grantedCommands },
        character: { id: 'meo-beo-k7ma3x', name: 'Mèo Béo', discordId: '111' },
      }),
    },
    classSurveys: { open, unanswered },
    clock: { now: () => NOW },
    links: {
      webOrigin: 'https://mmgh-nth.vercel.app',
      guildRoleId: '999888777',
    },
  } as unknown as CommandDeps;
}

/** What `ClassSurveyService.open` returns for the survey the command just asked for. */
function openStub(): jest.Mock {
  return jest.fn().mockImplementation((title: string, closesAt: Date) =>
    Promise.resolve({
      id: SURVEY_ID,
      title,
      closesAt: closesAt.toISOString(),
      isOpen: true,
    }),
  );
}

describe('/khao-sat-luu-phai definition', () => {
  it('giới hạn độ dài option ten để Discord chặn tên quá dài trước khi tới bot', () => {
    const open = khaoSatLuuPhaiCommand.definition.options?.find(
      (option) => option.name === 'mo',
    );
    const title = open?.options?.find((option) => option.name === 'ten');

    expect(title?.max_length).toBe(SURVEY_TITLE_MAX_LENGTH);
  });
});

describe('/khao-sat-luu-phai mo', () => {
  it('admin mở đợt: tin công khai ping role bang, có embed và đúng hai nút', async () => {
    const open = openStub();

    const reply = await khaoSatLuuPhaiCommand.execute(
      invocation('06/11'),
      makeDeps(GuildRole.ADMIN, open),
    );

    expect(reply.type).toBe(INTERACTION_RESPONSE_TYPE.channelMessageWithSource);
    expect(reply.data.flags).toBeUndefined();
    expect(reply.data.content).toBe('<@&999888777>');
    expect(reply.data.allowed_mentions).toEqual({ roles: ['999888777'] });

    const embed = reply.data.embeds?.[0];
    expect(embed?.title).toContain('Update 06/11');
    expect(embed?.description).toContain('06/11/2026');
    expect(embed?.description).toContain('Sửa lại được đến hạn chót');

    const buttons = (reply.data.components?.[0].components ??
      []) as ButtonComponent[];
    expect(buttons).toHaveLength(2);
    expect(buttons[0].type).toBe(COMPONENT_TYPE.button);
    expect(buttons[0].label).toContain('Điền khảo sát');
    expect(
      decodeSurveyFillId((buttons[0] as { custom_id: string }).custom_id),
    ).toBe(SURVEY_ID);
    expect(buttons[1]).toMatchObject({
      url: 'https://mmgh-nth.vercel.app/dang-nhap?redirect=%2Fluu-phai',
    });
  });

  it('hạn chót là 23:59:59.999 giờ Việt Nam của ngày gõ', async () => {
    const open = openStub();

    await khaoSatLuuPhaiCommand.execute(
      invocation('06/11'),
      makeDeps(GuildRole.ADMIN, open),
    );

    const [[, closesAt]] = open.mock.calls as [[string, Date]];
    expect(closesAt.toISOString()).toBe(
      new Date(vn('2026-11-06T23:59').getTime() + 59_999).toISOString(),
    );
  });

  it('Quản lý được cấp lệnh mở được đợt', async () => {
    const open = openStub();

    const reply = await khaoSatLuuPhaiCommand.execute(
      invocation('06/11'),
      makeDeps(GuildRole.MANAGER, open, [GrantableCommand.KHAO_SAT_LUU_PHAI]),
    );

    expect(reply.data.content).toBe('<@&999888777>');
  });

  it('không có quyền thì bị từ chối riêng và không mở đợt', async () => {
    const open = openStub();

    const reply = await khaoSatLuuPhaiCommand.execute(
      invocation('06/11'),
      makeDeps(GuildRole.MEMBER, open),
    );

    expect(reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
    expect(reply.data.content).toBe(NOT_GRANTED);
    expect(open).not.toHaveBeenCalled();
  });

  it('ngày sai thì báo rõ và không mở đợt', async () => {
    const open = openStub();

    const reply = await khaoSatLuuPhaiCommand.execute(
      invocation('31/02'),
      makeDeps(GuildRole.ADMIN, open),
    );

    expect(reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
    expect(reply.data.content).toContain('dd/mm');
    expect(open).not.toHaveBeenCalled();
  });

  it('ngày đã qua thì báo rõ và không mở đợt', async () => {
    const open = openStub();

    const reply = await khaoSatLuuPhaiCommand.execute(
      invocation('30/10'),
      makeDeps(GuildRole.ADMIN, open),
    );

    expect(reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
    expect(reply.data.content).toContain('đã qua');
    expect(open).not.toHaveBeenCalled();
  });

  it('hạn là hôm nay vẫn mở được: đợt đóng cuối ngày', async () => {
    const open = openStub();

    await khaoSatLuuPhaiCommand.execute(
      invocation('01/11'),
      makeDeps(GuildRole.ADMIN, open),
    );

    expect(open).toHaveBeenCalledTimes(1);
  });
});

const REMIND = {
  type: 2 as const,
  channel_id: '424242',
  data: {
    name: 'khao-sat-luu-phai',
    options: [{ name: 'nhac', type: 1 as const, options: [] }],
  },
  member: { user: { id: '111' } },
};

const OPEN_SURVEY = {
  id: SURVEY_ID,
  title: 'Update 06/11',
  closesAt: vn('2026-11-06T23:59').toISOString(),
  isOpen: true,
};

/** @returns A `classSurveys.unanswered` stub resolving to the open survey and the given members */
function unansweredStub(
  members: { id: string; name: string; discordId: string | null }[],
): jest.Mock {
  return jest
    .fn()
    .mockResolvedValue({ survey: OPEN_SURVEY, unanswered: members });
}

describe('/khao-sat-luu-phai nhac', () => {
  it('không có quyền thì bị từ chối và không đọc ai', async () => {
    const unanswered = unansweredStub([]);

    const reply = await khaoSatLuuPhaiCommand.execute(
      REMIND,
      makeDeps(GuildRole.MEMBER, jest.fn(), [], unanswered),
    );

    expect(reply.data.content).toBe(NOT_GRANTED);
    expect(unanswered).not.toHaveBeenCalled();
  });

  it('không có đợt mở thì báo rõ và không ping ai', async () => {
    const reply = await khaoSatLuuPhaiCommand.execute(
      REMIND,
      makeDeps(
        GuildRole.ADMIN,
        jest.fn(),
        [],
        jest.fn().mockResolvedValue(null),
      ),
    );

    expect(reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
    expect(reply.data.content).toContain('không có đợt khảo sát');
    expect(reply.data.allowed_mentions).toBeUndefined();
  });

  it('mọi người đã điền thì báo vậy và không ping ai', async () => {
    const reply = await khaoSatLuuPhaiCommand.execute(
      REMIND,
      makeDeps(GuildRole.ADMIN, jest.fn(), [], unansweredStub([])),
    );

    expect(reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
    expect(reply.data.content).toContain('Mọi người đã điền');
    expect(reply.data.allowed_mentions).toBeUndefined();
  });

  it('ping từng người chưa điền, kèm nút điền, và chỉ mở đúng các id đó', async () => {
    const reply = await khaoSatLuuPhaiCommand.execute(
      REMIND,
      makeDeps(
        GuildRole.MANAGER,
        jest.fn(),
        [GrantableCommand.KHAO_SAT_LUU_PHAI],
        unansweredStub([
          { id: 'a', name: 'A', discordId: '1001' },
          { id: 'b', name: 'B', discordId: '1002' },
        ]),
      ),
    );

    expect(reply.data.flags).toBeUndefined();
    expect(reply.data.content).toContain('<@1001> <@1002>');
    expect(reply.data.allowed_mentions).toEqual({ users: ['1001', '1002'] });

    const button = reply.data.components?.[0].components[0] as {
      custom_id: string;
    };
    expect(decodeSurveyFillId(button.custom_id)).toBe(SURVEY_ID);
  });

  it('người chưa liên kết Discord không bị ping nhưng được đếm trong tin', async () => {
    const reply = await khaoSatLuuPhaiCommand.execute(
      REMIND,
      makeDeps(
        GuildRole.ADMIN,
        jest.fn(),
        [],
        unansweredStub([
          { id: 'a', name: 'A', discordId: '1001' },
          { id: 'b', name: 'B', discordId: null },
          { id: 'c', name: 'C', discordId: null },
        ]),
      ),
    );

    expect(reply.data.content).toContain('2 người chưa điền');
    expect(reply.data.content).toContain('không ping được');
    expect(reply.data.allowed_mentions).toEqual({ users: ['1001'] });
  });

  it('chỉ còn người chưa liên kết thì không đăng tin ping', async () => {
    const reply = await khaoSatLuuPhaiCommand.execute(
      REMIND,
      makeDeps(
        GuildRole.ADMIN,
        jest.fn(),
        [],
        unansweredStub([{ id: 'b', name: 'B', discordId: null }]),
      ),
    );

    expect(reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
    expect(reply.data.content).toContain('không ping được');
    expect(reply.data.allowed_mentions).toBeUndefined();
  });

  it('danh sách quá dài thì cắt theo giới hạn, ghi số người bị bỏ, và id khớp nội dung', async () => {
    const members = Array.from({ length: 200 }, (_, index) => ({
      id: `m${index}`,
      name: `M${index}`,
      discordId: String(100_000_000_000_000_000n + BigInt(index)),
    }));

    const reply = await khaoSatLuuPhaiCommand.execute(
      REMIND,
      makeDeps(GuildRole.ADMIN, jest.fn(), [], unansweredStub(members)),
    );

    const content = reply.data.content;
    const pinged = reply.data.allowed_mentions?.users ?? [];

    expect(content.length).toBeLessThanOrEqual(MAX_CONTENT_LENGTH);
    expect(pinged.length).toBeLessThan(members.length);
    expect(content).toContain(`và ${members.length - pinged.length} người nữa`);
    expect(content.match(/<@\d+>/g)).toEqual(pinged.map((id) => `<@${id}>`));
  });
});
