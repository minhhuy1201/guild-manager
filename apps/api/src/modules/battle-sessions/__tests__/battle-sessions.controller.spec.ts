import { Capability } from '@guild/shared/enums';

import { CapabilityGuard, JwtAuthGuard } from '../../../common';
import { accessOf, guardsOf } from '../../../__tests__/guards-of';
import { BattleSessionsController } from '../battle-sessions.controller';

describe('BattleSessionsController', () => {
  it('mọi route đều cần một phiên đăng nhập', () => {
    expect(guardsOf(BattleSessionsController)).toEqual([JwtAuthGuard]);
  });

  it('sửa lịch, mở lại điểm danh và xem tuần thiết lập được thì cần Capability lịch trận', () => {
    for (const method of [
      'create',
      'update',
      'remove',
      'getWeeks',
      'reopenAttendance',
    ]) {
      expect(guardsOf(BattleSessionsController, method)).toEqual([
        CapabilityGuard,
      ]);
      expect(accessOf(BattleSessionsController, method)).toEqual({
        kind: 'capability',
        capability: Capability.SCHEDULE,
      });
    }
  });

  it('đọc lịch và tuần đang mở chỉ cần một phiên đăng nhập', () => {
    for (const method of ['list', 'getCurrentWeek']) {
      expect(guardsOf(BattleSessionsController, method)).toEqual([]);
      expect(accessOf(BattleSessionsController, method)).toBeUndefined();
    }
  });
});
