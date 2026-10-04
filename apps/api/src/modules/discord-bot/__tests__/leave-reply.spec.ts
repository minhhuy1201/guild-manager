import { ConflictException } from '@nestjs/common';
import { GuildRole } from '@guild/shared/enums';

import { FixedClock, TOKEN_TYPE } from '../../../common';
import type { CommandDeps } from '../commands/command.types';
import { submitLeave } from '../leave-reply';
import { vn } from '../../../__tests__/vn-date';

const ACTOR = { sub: '111', role: GuildRole.MEMBER, type: TOKEN_TYPE.access };
const LINKED = {
  actor: ACTOR,
  character: { id: 'meo-beo', name: 'Mèo Béo', discordId: '111' },
};

function makeDeps(resolved: unknown, create = jest.fn()) {
  const deps = {
    actors: { resolve: jest.fn().mockResolvedValue(resolved) },
    leaves: { create },
    clock: new FixedClock(vn('2026-10-04T12:00')),
  } as unknown as CommandDeps;

  return { deps, create };
}

describe('submitLeave', () => {
  it('khai nghỉ cho nhân vật của người gọi và báo khoảng ngày', async () => {
    const { deps, create } = makeDeps(
      LINKED,
      jest
        .fn()
        .mockResolvedValue({ startDate: '2026-10-05', endDate: '2026-10-12' }),
    );

    const reply = await submitLeave(
      '111',
      { from: '05/10', to: '12/10', reason: 'du lịch' },
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

  it.each([
    ['mai', '12/10'],
    ['05/10', 'abc'],
  ])(
    'báo lỗi định dạng khi %s - %s không đọc được, không gọi service',
    async (from, to) => {
      const { deps, create } = makeDeps(LINKED);

      const reply = await submitLeave('111', { from, to, reason: null }, deps);

      expect(reply.data.content).toBe('Ngày phải có dạng dd/mm, ví dụ 05/10.');
      expect(create).not.toHaveBeenCalled();
    },
  );

  it('từ chối khoảng ngược bằng message của schema dùng chung', async () => {
    const { deps, create } = makeDeps(LINKED);

    const reply = await submitLeave(
      '111',
      { from: '12/10', to: '05/10', reason: null },
      deps,
    );

    expect(reply.data.content).toBe(
      'Ngày kết thúc phải từ ngày bắt đầu trở đi.',
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('từ chối lý do dài quá 255 ký tự bằng message của schema, không gọi service', async () => {
    const { deps, create } = makeDeps(LINKED);

    const reply = await submitLeave(
      '111',
      { from: '05/10', to: '12/10', reason: 'x'.repeat(256) },
      deps,
    );

    expect(reply.data.content).toBe('Lý do tối đa 255 ký tự.');
    expect(create).not.toHaveBeenCalled();
  });

  it('ngày kết thúc không năm lấy năm sau khi khoảng nghỉ qua năm mới', async () => {
    const { deps, create } = makeDeps(
      LINKED,
      jest
        .fn()
        .mockResolvedValue({ startDate: '2026-12-30', endDate: '2027-01-05' }),
    );

    await submitLeave(
      '111',
      { from: '30/12', to: '05/01', reason: null },
      deps,
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: '2026-12-30',
        endDate: '2027-01-05',
      }),
      ACTOR,
    );
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
      submitLeave('111', { from: '05/10', to: '12/10', reason: null }, deps),
    ).rejects.toThrow('Khoảng nghỉ trùng với lần nghỉ 12/10 - 15/10.');
  });

  it('nói rõ khi người gọi chưa được gán nhân vật', async () => {
    const { deps } = makeDeps(null);

    const reply = await submitLeave(
      '111',
      { from: '05/10', to: '12/10', reason: null },
      deps,
    );

    expect(reply.data.content).toContain('chưa được gán nhân vật');
  });

  it('admin cứu hộ không có nhân vật thì được hướng sang /diem-danh-ho', async () => {
    const { deps } = makeDeps({
      actor: { ...ACTOR, role: GuildRole.ADMIN },
      character: null,
    });

    const reply = await submitLeave(
      '111',
      { from: '05/10', to: '12/10', reason: null },
      deps,
    );

    expect(reply.data.content).toContain('/diem-danh-ho');
  });
});
