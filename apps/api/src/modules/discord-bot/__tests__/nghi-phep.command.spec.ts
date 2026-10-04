import { ConflictException } from '@nestjs/common';
import { GuildRole } from '@guild/shared/enums';

import { FixedClock, TOKEN_TYPE } from '../../../common';
import { nghiPhepCommand } from '../commands/nghi-phep.command';
import type { CommandDeps } from '../commands/command.types';
import { vn } from '../../../__tests__/vn-date';

const ACTOR = {
  sub: '111',
  role: GuildRole.MEMBER,
  type: TOKEN_TYPE.access,
};

/** Build a /nghi-phep invocation; omitted options are simply absent, as Discord sends them. */
function invocation(options: Record<string, string>) {
  return {
    type: 2 as const,
    channel_id: '424242',
    data: {
      name: 'nghi-phep',
      options: Object.entries(options).map(([name, value]) => ({
        name,
        value,
      })),
    },
    member: { user: { id: '111' } },
  };
}

function makeDeps(resolved: unknown, create = jest.fn()) {
  const deps = {
    actors: { resolve: jest.fn().mockResolvedValue(resolved) },
    leaves: { create },
    clock: new FixedClock(vn('2026-10-04T12:00')),
  } as unknown as CommandDeps;

  return { deps, create };
}

const LINKED = {
  actor: ACTOR,
  character: { id: 'meo-beo', name: 'Mèo Béo', discordId: '111' },
};

describe('/nghi-phep', () => {
  it('khai nghỉ cho nhân vật của người gọi và báo khoảng ngày', async () => {
    const { deps, create } = makeDeps(
      LINKED,
      jest.fn().mockResolvedValue({
        startDate: '2026-10-05',
        endDate: '2026-10-12',
      }),
    );

    const reply = await nghiPhepCommand.execute(
      invocation({
        'tu-ngay': '05/10',
        'den-ngay': '12/10',
        'ly-do': 'du lịch',
      }),
      deps,
    );

    expect(create).toHaveBeenCalledWith(
      {
        characterId: 'meo-beo',
        startDate: '2026-10-05',
        endDate: '2026-10-12',
        reason: 'du lịch',
      },
      ACTOR,
    );
    expect(reply.data.content).toBe('Đã khai nghỉ 05/10 - 12/10.');
  });

  it('báo lỗi định dạng khi ngày không đọc được, không gọi service', async () => {
    const { deps, create } = makeDeps(LINKED);

    const reply = await nghiPhepCommand.execute(
      invocation({ 'tu-ngay': 'mai', 'den-ngay': '12/10' }),
      deps,
    );

    expect(reply.data.content).toBe('Ngày phải có dạng dd/mm, ví dụ 05/10.');
    expect(create).not.toHaveBeenCalled();
  });

  it('từ chối khoảng ngược bằng message của schema dùng chung', async () => {
    const { deps, create } = makeDeps(LINKED);

    const reply = await nghiPhepCommand.execute(
      invocation({ 'tu-ngay': '12/10', 'den-ngay': '05/10' }),
      deps,
    );

    expect(reply.data.content).toBe(
      'Ngày kết thúc phải từ ngày bắt đầu trở đi.',
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('để lỗi của service nổi lên cho router biến thành câu trả lời', async () => {
    const { deps } = makeDeps(
      LINKED,
      jest
        .fn()
        .mockRejectedValue(
          new ConflictException(
            'Khoảng nghỉ trùng với lần nghỉ 12/10 - 15/10.',
          ),
        ),
    );

    await expect(
      nghiPhepCommand.execute(
        invocation({ 'tu-ngay': '05/10', 'den-ngay': '12/10' }),
        deps,
      ),
    ).rejects.toThrow('Khoảng nghỉ trùng với lần nghỉ 12/10 - 15/10.');
  });

  it('nói rõ khi người gọi chưa được gán nhân vật', async () => {
    const { deps } = makeDeps(null);

    const reply = await nghiPhepCommand.execute(
      invocation({ 'tu-ngay': '05/10', 'den-ngay': '12/10' }),
      deps,
    );

    expect(reply.data.content).toContain('chưa được gán nhân vật');
  });
});
