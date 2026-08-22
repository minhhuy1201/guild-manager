import { TeamBuilderController } from '../team-builder.controller';
import { TeamBuilderService } from '../team-builder.service';

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
