import { AdminGuard, JwtAuthGuard } from '../../../common';
import { guardsOf } from '../../../__tests__/guards-of';
import { TeamBuilderController } from '../team-builder.controller';
import { TeamBuilderService } from '../team-builder.service';

describe('TeamBuilderController', () => {
  it('khoá toàn bộ endpoint cho quản trị viên ở cấp controller', () => {
    expect(guardsOf(TeamBuilderController)).toEqual([JwtAuthGuard, AdminGuard]);
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

describe('TeamBuilderController — tên đội', () => {
  let controller: TeamBuilderController;
  let teamBuilder: {
    getTeamNames: jest.Mock;
    saveTeamNames: jest.Mock;
  };

  beforeEach(() => {
    teamBuilder = {
      getTeamNames: jest.fn().mockResolvedValue({ '1': 'Thủ nhà' }),
      saveTeamNames: jest.fn().mockResolvedValue({ '2': 'Xung kích' }),
    };

    controller = new TeamBuilderController(
      teamBuilder as unknown as TeamBuilderService,
    );
  });

  it('trả về map tên service đưa ra', async () => {
    await expect(controller.getTeamNames()).resolves.toEqual({
      '1': 'Thủ nhà',
    });
  });

  it('lưu bằng chính map trong body, không bọc thêm', async () => {
    const names = { '2': 'Xung kích' };

    await expect(controller.saveTeamNames({ names })).resolves.toEqual(names);
    expect(teamBuilder.saveTeamNames).toHaveBeenCalledWith(names);
  });
});
