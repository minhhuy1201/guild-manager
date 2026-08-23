import { AdminGuard, JwtAuthGuard } from '../../../common';
import { guardsOf } from '../../../__tests__/guards-of';
import { CharactersController } from '../characters.controller';

describe('CharactersController', () => {
  it('khoá toàn bộ endpoint cho quản trị viên ở cấp controller', () => {
    expect(guardsOf(CharactersController)).toEqual([JwtAuthGuard, AdminGuard]);
  });
});
