import { ConflictException } from '@nestjs/common';
import { GuildRole } from '@guild/shared/enums';

import { TOKEN_TYPE } from '../../../common';
import { handleAttendanceButton } from '../attendance-board';
import type { CommandDeps } from '../commands/command.types';
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
 * @returns Stubbed deps
 */
function makeDeps(options: { mark: jest.Mock }): CommandDeps {
  return {
    actors: {
      resolve: jest.fn().mockResolvedValue({
        actor: { sub: '111', role: GuildRole.MEMBER, type: TOKEN_TYPE.access },
        characterId: 'meo-beo-k7ma3x',
      }),
    },
    characters: {
      findById: jest
        .fn()
        .mockResolvedValue({ id: 'meo-beo-k7ma3x', name: 'Mèo Béo' }),
    },
    battleSessions: { listByWeek: jest.fn().mockResolvedValue([]) },
    attendance: {
      getRecords: jest.fn().mockResolvedValue([]),
      mark: options.mark,
    },
  } as never;
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
    const board = await handleAttendanceButton(
      PRESS,
      makeDeps({ mark: jest.fn().mockResolvedValue(undefined) }),
    );

    expect(board.content).toContain('Mèo Béo');
  });

  it('custom_id lạ thì nói ra thay vì im lặng', async () => {
    const press = { ...PRESS, data: { custom_id: 'khong-phai-cua-toi' } };

    const board = await handleAttendanceButton(
      press,
      makeDeps({ mark: jest.fn() }),
    );

    expect(board.content).toContain('không còn dùng được');
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
