import { AdminGuard, JwtAuthGuard } from '../../../common';
import { guardsOf } from '../../../__tests__/guards-of';
import { BattleSessionsController } from '../battle-sessions.controller';

describe('BattleSessionsController', () => {
  it('mọi route đều cần một phiên đăng nhập', () => {
    expect(guardsOf(BattleSessionsController)).toEqual([JwtAuthGuard]);
  });

  it('sửa lịch và xem tuần thiết lập được thì phải là quản trị viên', () => {
    for (const method of ['create', 'update', 'remove', 'getWeeks']) {
      expect(guardsOf(BattleSessionsController, method)).toEqual([AdminGuard]);
    }
  });

  it('đọc lịch và tuần đang mở chỉ cần một phiên đăng nhập', () => {
    for (const method of ['list', 'getCurrentWeek']) {
      expect(guardsOf(BattleSessionsController, method)).toEqual([]);
    }
  });
});
