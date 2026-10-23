import { Capability, GuildRole } from '@guild/shared/enums';

import { CapabilityGuard, JwtAuthGuard } from '../../../common';
import { accessOf, guardsOf } from '../../../__tests__/guards-of';
import { CharactersController } from '../characters.controller';

describe('CharactersController', () => {
  it('khoá toàn bộ endpoint theo Capability thành viên ở cấp controller', () => {
    expect(guardsOf(CharactersController)).toEqual([
      JwtAuthGuard,
      CapabilityGuard,
    ]);
    expect(accessOf(CharactersController)).toEqual({
      kind: 'capability',
      capability: Capability.MEMBERS,
    });
  });

  it.each(['list', 'create', 'update'])(
    'route %s theo Capability thành viên',
    (method) => {
      expect(accessOf(CharactersController, method)).toEqual({
        kind: 'capability',
        capability: Capability.MEMBERS,
      });
    },
  );

  it('xóa thành viên chỉ Admin được, không Capability nào mở được', () => {
    expect(accessOf(CharactersController, 'remove')).toEqual({
      kind: 'admin',
    });
  });

  it('chuyển người gọi xuống service khi sửa, để service tự xét vai và Grant', async () => {
    const service = { update: jest.fn().mockResolvedValue({ id: 'm1' }) };
    const controller = new CharactersController(service as never);
    const actor = {
      sub: 'd1',
      role: GuildRole.MANAGER,
      type: 'access',
    } as never;

    await controller.update('m1', { name: 'X' }, actor);

    expect(service.update).toHaveBeenCalledWith('m1', { name: 'X' }, actor);
  });
});
