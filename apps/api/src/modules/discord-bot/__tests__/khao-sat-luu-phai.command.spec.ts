import { GrantableCommand, GuildRole } from '@guild/shared/enums';

import { TOKEN_TYPE } from '../../../common';
import { vn } from '../../../__tests__/vn-date';
import { khaoSatLuuPhaiCommand } from '../commands/khao-sat-luu-phai.command';
import type { CommandDeps } from '../commands/command.types';
import { decodeSurveyFillId } from '../custom-id';
import {
  COMPONENT_TYPE,
  INTERACTION_RESPONSE_TYPE,
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
 * @returns The deps
 */
function makeDeps(
  role: GuildRole,
  open: jest.Mock,
  grantedCommands: GrantableCommand[] = [],
): CommandDeps {
  return {
    actors: {
      resolve: jest.fn().mockResolvedValue({
        actor: { sub: '111', role, type: TOKEN_TYPE.access, grantedCommands },
        character: { id: 'meo-beo-k7ma3x', name: 'Mèo Béo', discordId: '111' },
      }),
    },
    classSurveys: { open },
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

    const buttons = reply.data.components?.[0].components ?? [];
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
