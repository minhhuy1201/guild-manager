import { ConflictException, ForbiddenException } from '@nestjs/common';
import { GuildRole } from '@guild/shared/enums';

import { TOKEN_TYPE } from '../../../common';
import {
  handleAttendanceButton,
  NOT_LINKED,
  type AttendanceButtonOutcome,
} from '../attendance-board';
import type { CommandDeps, MessagePayload } from '../commands/command.types';
import { INTERACTION_RESPONSE_TYPE, MESSAGE_FLAG } from '../discord.constants';
import { InteractionRouter } from '../interaction-router';

const PRESS = {
  type: 3 as const,
  data: { custom_id: 'dd:session-1:meo-beo-k7ma3x:1' },
  member: { user: { id: '111' } },
};

/**
 * Build deps whose `mark` is observable.
 * @param options.mark - The stub standing in for AttendanceService.mark
 * @param options.resolve - What ActorResolver.resolve returns; defaults to the presser themselves
 * @returns Stubbed deps
 */
function makeDeps(options: {
  mark: jest.Mock;
  resolve?: jest.Mock;
}): CommandDeps {
  return {
    actors: {
      resolve:
        options.resolve ??
        jest.fn().mockResolvedValue({
          actor: {
            sub: '111',
            role: GuildRole.MEMBER,
            type: TOKEN_TYPE.access,
          },
          characterId: 'meo-beo-k7ma3x',
        }),
    },
    characters: {
      findById: jest.fn().mockResolvedValue({
        id: 'meo-beo-k7ma3x',
        name: 'Mèo Béo',
        discordId: '222',
      }),
    },
    battleSessions: { listByWeek: jest.fn().mockResolvedValue([]) },
    attendance: {
      getRecords: jest.fn().mockResolvedValue([]),
      mark: options.mark,
    },
  } as never;
}

/**
 * The board an outcome carries.
 * @param outcome - What the press produced
 * @returns The board body
 * @throws Error when the press was refused, which reads better than a type assertion failing later
 */
function boardOf(outcome: AttendanceButtonOutcome): MessagePayload {
  if (outcome.kind !== 'board') {
    throw new Error(`Nút bị từ chối: ${outcome.message}`);
  }

  return outcome.body;
}

describe('bấm nút điểm danh', () => {
  it('ghi đúng nhân vật, ngày và câu trả lời trong custom_id', async () => {
    const mark = jest.fn().mockResolvedValue(undefined);

    await handleAttendanceButton(PRESS, makeDeps({ mark }));

    expect(mark).toHaveBeenCalledWith(
      {
        characterId: 'meo-beo-k7ma3x',
        sessionId: 'session-1',
        isPresent: true,
      },
      expect.objectContaining({ sub: '111' }),
    );
  });

  it('ghi xong thì vẽ lại bảng', async () => {
    const outcome = await handleAttendanceButton(
      PRESS,
      makeDeps({ mark: jest.fn().mockResolvedValue(undefined) }),
    );

    expect(boardOf(outcome).content).toContain('Mèo Béo');
  });

  it('bảng công khai vẽ lại vẫn nói ai được bấm', async () => {
    const outcome = await handleAttendanceButton(
      PRESS,
      makeDeps({ mark: jest.fn().mockResolvedValue(undefined) }),
    );

    expect(boardOf(outcome).content).toContain('Chỉ <@222> và admin bấm được');
  });

  it('bảng riêng vẽ lại thì không kèm dòng đó', async () => {
    // Bảng ephemeral chỉ một người thấy, và người đó đương nhiên được bấm.
    const press = { ...PRESS, message: { flags: MESSAGE_FLAG.ephemeral } };

    const outcome = await handleAttendanceButton(
      press,
      makeDeps({ mark: jest.fn().mockResolvedValue(undefined) }),
    );

    expect(boardOf(outcome).content).not.toContain('Chỉ <@222>');
  });

  it('custom_id lạ thì nói ra thay vì im lặng', async () => {
    const press = { ...PRESS, data: { custom_id: 'khong-phai-cua-toi' } };

    const outcome = await handleAttendanceButton(
      press,
      makeDeps({ mark: jest.fn() }),
    );

    expect(outcome).toEqual({
      kind: 'refusal',
      message:
        'Nút này không còn dùng được. Gõ lại /diem-danh để lấy bảng mới.',
    });
  });
});

describe('người ngoài bấm nút trên bảng công khai', () => {
  /**
   * A router wired to the given deps, with the config and Discord clients stubbed away.
   * @param deps - Stubbed services
   * @returns The router under test
   */
  function routerOf(deps: CommandDeps): InteractionRouter {
    return new InteractionRouter(
      deps.attendance,
      deps.battleSessions,
      deps.characters,
      deps.actors,
      { get: jest.fn().mockReturnValue('') } as never,
      {} as never,
      {} as never,
      {} as never,
    );
  }

  it('chưa gán nhân vật thì nhận tin riêng, không ghi đè bảng', async () => {
    // Cập nhật tin nhắn ở đây sẽ xoá bảng công khai của cả kênh.
    const deps = makeDeps({
      mark: jest.fn(),
      resolve: jest.fn().mockResolvedValue(null),
    });

    const reply = await routerOf(deps).route(PRESS);

    expect(reply).toEqual({
      type: INTERACTION_RESPONSE_TYPE.channelMessageWithSource,
      data: { content: NOT_LINKED, flags: MESSAGE_FLAG.ephemeral },
    });
  });

  it('không phải nhân vật của mình thì cũng vậy', async () => {
    const deps = makeDeps({
      mark: jest
        .fn()
        .mockRejectedValue(
          new ForbiddenException(
            'Bạn chỉ điểm danh được cho nhân vật của mình.',
          ),
        ),
    });

    const reply = await routerOf(deps).route(PRESS);

    expect(reply).toEqual({
      type: INTERACTION_RESPONSE_TYPE.channelMessageWithSource,
      data: {
        content: 'Bạn chỉ điểm danh được cho nhân vật của mình.',
        flags: MESSAGE_FLAG.ephemeral,
      },
    });
  });
});

describe('lỗi từ AttendanceService', () => {
  it('thành một câu tiếng Việt trong Discord, không phải mã lỗi', async () => {
    // Mọi mã khác 200 đều làm Discord hiện "ứng dụng không phản hồi".
    const deps = makeDeps({
      mark: jest
        .fn()
        .mockRejectedValue(
          new ConflictException('Đã quá hạn điểm danh ngày này.'),
        ),
    });
    const router = new InteractionRouter(
      deps.attendance,
      deps.battleSessions,
      deps.characters,
      deps.actors,
      { get: jest.fn().mockReturnValue('') } as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const reply = await router.route(PRESS);

    expect(reply).toEqual({
      type: INTERACTION_RESPONSE_TYPE.channelMessageWithSource,
      data: {
        content: 'Đã quá hạn điểm danh ngày này.',
        flags: MESSAGE_FLAG.ephemeral,
      },
    });
  });
});
