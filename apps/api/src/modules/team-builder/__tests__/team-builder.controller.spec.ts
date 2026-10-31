import { Capability, TeamColor } from '@guild/shared/enums';

import { CapabilityGuard, JwtAuthGuard } from '../../../common';
import { accessOf, guardsOf } from '../../../__tests__/guards-of';
import { TeamBuilderController } from '../team-builder.controller';
import { TeamBuilderService } from '../team-builder.service';

describe('TeamBuilderController', () => {
  it('khoá toàn bộ endpoint theo Capability xếp team ở cấp controller', () => {
    expect(guardsOf(TeamBuilderController)).toEqual([
      JwtAuthGuard,
      CapabilityGuard,
    ]);
    expect(accessOf(TeamBuilderController)).toEqual({
      kind: 'capability',
      capability: Capability.TEAM_BUILDER,
    });
  });
});

describe('TeamBuilderController.getWeeks', () => {
  let controller: TeamBuilderController;
  let teamBuilder: {
    purgeExpiredFormations: jest.Mock;
    getWeeks: jest.Mock;
  };

  beforeEach(() => {
    teamBuilder = {
      purgeExpiredFormations: jest.fn().mockResolvedValue(0),
      getWeeks: jest.fn().mockResolvedValue([]),
    };

    controller = new TeamBuilderController(
      teamBuilder as unknown as TeamBuilderService,
    );
  });

  it('không dọn dữ liệu trên đường GET', async () => {
    await controller.getWeeks();

    expect(teamBuilder.purgeExpiredFormations).not.toHaveBeenCalled();
  });

  it('trả về đúng danh sách tuần service đưa ra', async () => {
    const weeks = [
      {
        weekStart: '2026-07-19T17:00:00.000Z',
        weekEnd: '2026-07-25T16:59:00.000Z',
        isActive: true,
      },
    ];
    teamBuilder.getWeeks.mockResolvedValue(weeks);

    await expect(controller.getWeeks()).resolves.toEqual(weeks);
  });
});

describe('TeamBuilderController — cài đặt đội', () => {
  let controller: TeamBuilderController;
  let teamBuilder: {
    getTeamSettings: jest.Mock;
    saveTeamSettings: jest.Mock;
  };

  beforeEach(() => {
    teamBuilder = {
      getTeamSettings: jest.fn().mockResolvedValue({
        names: { '1': 'Thủ nhà' },
        colors: {},
        version: 1,
      }),
      saveTeamSettings: jest.fn().mockResolvedValue({
        names: { '2': 'Xung kích' },
        colors: {},
        version: 5,
      }),
    };

    controller = new TeamBuilderController(
      teamBuilder as unknown as TeamBuilderService,
    );
  });

  it('trả về bundle tên + màu service đưa ra', async () => {
    await expect(controller.getTeamSettings()).resolves.toEqual({
      names: { '1': 'Thủ nhà' },
      colors: {},
      version: 1,
    });
  });

  it('lưu bằng chính body, version đi cùng names và colors', async () => {
    const body = {
      names: { '2': 'Xung kích' },
      colors: { '2': TeamColor.RED },
      version: 4,
    };

    await controller.saveTeamSettings(body);

    expect(teamBuilder.saveTeamSettings).toHaveBeenCalledWith(body);
  });

  it('lưu đội hình bằng cả body, version đi cùng matches', async () => {
    const saveFormation = jest.fn().mockResolvedValue({});
    const withFormation = new TeamBuilderController({
      saveFormation,
    } as unknown as TeamBuilderService);
    const body = { matches: [{ slots: {}, notes: {} }], version: 3 };

    await withFormation.saveFormation('s1', body);

    expect(saveFormation).toHaveBeenCalledWith('s1', body);
  });
});
