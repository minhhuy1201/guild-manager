import { Capability } from '@guild/shared/enums';

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
});
